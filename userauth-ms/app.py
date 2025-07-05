import os
import sys
import json
import requests
from flask import Flask, request, jsonify, abort, make_response
from flask_cors import CORS
from datetime import timedelta, datetime
from auth import hash_password, verify_password
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import pika
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    JWTManager,
    decode_token,
)
import redis
from werkzeug.middleware.proxy_fix import ProxyFix
from flask.wrappers import Response

class JSONWrapper:
    def __init__(self, data):
        # guardamos el dict (o None)
        self._data = data or {}
    def __call__(self):
        # para que resp.json() devuelva el dict
        return self._data
    def get(self, key, default=None):
        return self._data.get(key, default)
    def __getitem__(self, key):
        return self._data[key]
    def items(self):
        return self._data.items()
    def keys(self):
        return self._data.keys()
    def values(self):
        return self._data.values()
    def __len__(self):
        return len(self._data)
    def __iter__(self):
        return iter(self._data)

# reemplazamos el property json original por uno que envuelva en JSONWrapper
Response.json = property(lambda self: JSONWrapper(self.get_json()))

# 1) Cargamos variables de entorno de .env antes de cualquier configuración
load_dotenv()

# 2) Configuración de Redis (usa REDIS_URL o los valores REDIS_HOST / REDIS_PORT)
redis_client = redis.from_url(
    os.getenv(
        "REDIS_URL",
        f"redis://{os.getenv('REDIS_HOST', 'recipy-cache')}:{os.getenv('REDIS_PORT', 6379)}/0"
    ),
    decode_responses=True
)

# 3) Configuración de RabbitMQ (mail-broker)
RABBIT_URL  = os.getenv("RABBITMQ_URL",  "amqp://guest:guest@mail-broker/")
RABBIT_HOST = os.getenv("RABBITMQ_HOST", "mail-broker")
RABBIT_PORT = int(os.getenv("RABBITMQ_PORT", 5672))
pika_params = pika.ConnectionParameters(host=RABBIT_HOST, port=RABBIT_PORT)

# 4) Inicialización de Flask
app = Flask(__name__)
# aplicar ProxyFix para coger 1 nivel de proxy X-Forwarded-For
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
CORS(app)

# 5) Configuración de PostgREST para gestión de usuarios
PGRST = os.getenv("PGRST_URL_LOCAL",
                  os.getenv("PGRST_URL", "")).rstrip("/") # ej: http://userauth-postgrest:3000
HEADERS = {"Content-Type": "application/json"}

# 6) Configuración de JWT
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET", "change-me")
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    hours=int(os.getenv("JWT_EXP_HOURS", "24"))
)
jwt = JWTManager(app)


def get_client_ip():
    """
    Toma la primera IP listada en X-Forwarded-For (si existe),
    o en su defecto request.remote_addr.
    """
    xff = request.headers.get("x-forwarded-for", "")
    print("El header X-Forwarded-For es:", xff, file=sys.stderr)
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr or ""


@jwt.token_in_blocklist_loader
def check_token_binding(jwt_header, jwt_payload):
    """
    Se dispara en cada petición @jwt_required():
      - Recupera el jti del payload
      - Recupera el token completo del header
      - Consulta la IP del cliente
      - Comprueba en Redis (cache) o en Postgres la IP ligada al token
      - Si hay mismatch, elimina el binding en Redis y revoca el token en BD
    """
    # Extraemos identificador único del token y token completo
    print("Validando token con JTI:", jwt_payload["jti"], file=sys.stderr)
    jti         = jwt_payload["jti"]
    token       = request.headers.get("Authorization", "").split()[-1]
    current_ip  = get_client_ip()
    binding_key = f"token_ip:{jti}"

    # 1) Intento de validación desde Redis (cache) para performance
    try:
        stored_ip = redis_client.get(binding_key)
    except Exception:
        stored_ip = None  # Si falla Redis, haremos fallback a Postgres

    print("IP almacenada en Redis:", stored_ip, file=sys.stderr)

    if stored_ip:
        # Si Redis devolvió una IP cacheada...
        if stored_ip != current_ip:
            # — IP distinta detectada en cache: borramos binding en Redis
            try:
                redis_client.delete(binding_key)
            except Exception:
                pass
            # — Y revocamos permanentemente el token en la base de datos
            _revoke_token_in_db(token)
            return True  # Token bloqueado
        # IP en cache coincide con la actual: token válido
        return False

    # 2) Fallback a Postgres si no había binding en Redis o Redis falló
    conn = get_token_db_conn()
    cur  = conn.cursor()
    cur.execute(
        "SELECT issued_ip FROM recipy.jwt_tokens WHERE token = %s;",
        (token,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    print("IP emitida en Postgres:", row, file=sys.stderr)

    if not row:
        # Token no existe o ya fue eliminado → bloqueado
        return True

    issued_ip = row[0]
    if issued_ip == current_ip:
        # IP coincide según Postgres: volvemos a cachear en Redis con TTL
        try:
            ttl_seconds = int(app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
            redis_client.setex(binding_key, ttl_seconds, issued_ip)
        except Exception:
            pass
        return False  # Token válido

    # Si llegamos aquí, mismatch detectado en Postgres:
    # borramos también cualquier binding residual en Redis
    try:
        redis_client.delete(binding_key)
    except Exception:
        pass
    # revocamos el token en la base de datos
    _revoke_token_in_db(token)
    return True  # Token bloqueado


def _revoke_token_in_db(token: str):
    """
    Elimina permanentemente el registro del token en Postgres,
    para que futuras validaciones (incluyendo /validate) lo consideren revocado.
    """
    try:
        conn = get_token_db_conn()
        cur  = conn.cursor()
        cur.execute("DELETE FROM recipy.jwt_tokens WHERE token = %s;", (token,))
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        # Ignoramos errores de revocación en BD
        pass


def get_token_db_conn():
    """
    Conexión a la base de datos de tokens (token-db),
    usando HOST/PORT desde el entorno para que los tests
    (y los contenedores) puedan sobrescribirlos.
    """
    host = os.getenv("TOKEN_DB_HOST", "token-db")
    port = int(os.getenv("TOKEN_DB_PORT", 5432))
    return psycopg2.connect(
        host=host,
        port=port,
        dbname=os.getenv("TOKEN_DB_NAME"),
        user=os.getenv("TOKEN_DB_USER"),
        password=os.getenv("TOKEN_DB_PASSWORD")
    )


def pg(path, **kw):
    """
    Helper para llamar a PostgREST.
    Uso:
      pg("users", method="POST", headers=..., json=...)
      pg(f"users?username=eq.{u}", headers=...)
    """
    return requests.request(
        method=kw.pop("method", "GET"),
        url=f"{PGRST}/{path}",
        **kw
    )


@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}

    # 1. Validación de campos obligatorios
    for field in ("name", "email", "username", "password"):
        if not data.get(field):
            return jsonify({"error": f"Falta campo {field}"}), 400

    # 2. Preparar payload para RPC register_user
    payload = {
        "_name":     data["name"],
        "_email":    data["email"],
        "_username": data["username"],
        "_password": data["password"],
    }

    # 3. Llamada al RPC en PostgREST
    r = pg("rpc/register_user", method="POST", headers=HEADERS, json=payload)

    # 4. Registro exitoso
    if r.status_code == 200:
        resp = r.json()
        if not resp:
            abort(500, "RPC no devolvió el ID del usuario")
        user_id = resp[0]["id"]

        # Enviar email de bienvenida vía RabbitMQ
        try:
            conn_params = pika.BlockingConnection(pika_params)
            ch = conn_params.channel()
            ch.queue_declare(queue="send-email", durable=True)
            email_msg = {
                "to": data["email"],
                "subject": "¡Bienvenido a Recipy!",
               "body": f"Hola {data['name']},<br><br>Gracias por registrarte en Recipy."
            }
            ch.basic_publish(
                exchange="",
                routing_key="send-email",
                body=json.dumps(email_msg),
                properties=pika.BasicProperties(delivery_mode=2)
            )
        except Exception as e:
            app.logger.error(f"No se pudo encolar correo de bienvenida: {e}")
        finally:
            try:
                conn_params.close()
            except:
                pass

        return jsonify({"message": "User registered"}), 201

    # 5. Manejo de conflictos (username o email duplicado)
    if r.status_code in (409, 422):
        if r.headers.get("Content-Type", "").startswith("application/json"):
            detail = r.json().get("message", r.text)
        else:
            detail = r.text
        return jsonify({
            "error": "Username o email ya registrado",
            "detail": detail
        }), 409

    # 6. Otros errores
    return abort(r.status_code, r.text)


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing credentials"}), 400

    # 1. Verificar usuario en PostgREST
    r = pg(f"users?username=eq.{data['username']}", headers={"Accept": "application/json"})
    if r.status_code != 200 or not r.json():
        return jsonify({"error": "Invalid username or password"}), 401

    user = r.json()[0]
    if not verify_password(data["password"], user["password_hash"]):
        return jsonify({"error": "Invalid username or password"}), 401

    # 2. Crear JWT y guardarlo en token‑db junto con la IP remota
    print("Intnetando crear JWT para el usuario:", user["id"], file=sys.stderr)
    token     = create_access_token(identity=user["id"])
    exp       = datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
    issued_ip = get_client_ip()
    print("IP del cliente:", issued_ip, file=sys.stderr)

    conn = get_token_db_conn()
    cur  = conn.cursor()
    cur.execute(
        """
        INSERT INTO recipy.jwt_tokens
          (token, user_id, expires_at, issued_ip)
        VALUES (%s, %s, %s, %s);
        """,
        (token, user["id"], exp, issued_ip)
    )
    conn.commit()
    conn.close()

    # 3. Cachear token en Redis con TTL igual a la expiración del JWT
    try:
        ttl = int(app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
        redis_client.setex(f"token:{token}", ttl, user["id"])
    except Exception as e:
        app.logger.error(f"Error cacheando token en Redis: {e}")

    return jsonify({"token": token})




@app.route("/profile/<int:user_id>", methods=["GET"])
def public_profile(user_id):
    """
    Endpoint público para obtener datos de perfil de cualquier usuario por su ID.
    No requiere autenticación.
    """
    r = pg(f"users?id=eq.{user_id}", headers={"Accept": "application/json"})

    if r.status_code != 200 or not r.json():
        return jsonify({"error": "Usuario no encontrado"}), 404

    user = r.json()[0]
    # Retornar solo campos públicos
    public_data = {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "profile_picture": user.get("profile_picture"),
        "biography": user.get("biography"),
        "location": user.get("location"),
    }

    return jsonify(public_data), 200


@app.route("/profile", methods=["GET", "PUT"])
@jwt_required()
def profile_alias():
    # delega en la misma función que ya tenemos
    return profile()


@app.route("/my-profile", methods=["GET", "PUT"])
@jwt_required()
def profile():
    uid = get_jwt_identity()

    if request.method == "GET":
        r = pg(f"users?id=eq.{uid}", headers={"Accept": "application/json"})
        if r.status_code != 200 or not r.json():
            abort(r.status_code)
        user = r.json()[0]
        user.pop("password_hash", None)
        return jsonify(user)

    # PUT: actualización de perfil
    update = request.json or {}
    allowed = {"profile_picture", "biography", "location", "birth_date"}
    payload = {k: v for k, v in update.items() if k in allowed}
    if not payload:
        return jsonify({"error": "No valid fields to update"}), 400

    headers = {
        **HEADERS,
        "Prefer": "return=representation",
        "Authorization": f"Bearer {request.headers.get('Authorization').split()[1]}"
    }
    r = pg(f"users?id=eq.{uid}", method="PATCH", headers=headers, json=payload)
    if r.status_code not in (200, 204):
        abort(r.status_code, description=r.text)

    updated = r.json()[0] if r.json() else {}
    updated.pop("password_hash", None)
    return jsonify(updated)


@app.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    Devuelve el ID del usuario extraído del JWT ('sub').
    """
    print("consultando el ID del usuario autenticado", file=sys.stderr)
    print("JWT contiene:", get_jwt_identity(), file=sys.stderr)
    return jsonify({"id": str(get_jwt_identity())})


@jwt.expired_token_loader
def my_expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        "error": "Token expirado",
        "detail": "Por favor, vuelve a iniciar sesión."
    }), 401


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """
    Se dispara cuando @jwt_required encuentra el token en la blocklist.
    Devuelve un JSON con error estándar para tu test.
    """
    return jsonify({"error": "Token inválido"}), 401


@app.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    token = request.headers.get("Authorization").split()[1]

    # 1. Eliminar de token-db
    conn = get_token_db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM recipy.jwt_tokens WHERE token = %s;", (token,))
    conn.commit()
    conn.close()

    # 2. Eliminar de Redis
    try:
        redis_client.delete(f"token:{token}")
    except Exception as e:
        app.logger.error(f"Error eliminando token de Redis: {e}")

    return jsonify({"msg": "Logged out"}), 200


@app.route("/validate", methods=["GET"])
def validate():
    """
    Endpoint para validar un token JWT y su binding de IP.
    Cada Response expone un método .json() para que los tests que hacen r.json() pasen.
    """
    # Extraemos el token del header Authorization (Bearer <token>)
    token = request.headers.get("Authorization", "").split("Bearer ")[-1]

    # -------------------------------------------------------------------------
    # 1) Verificación de firma y expiración, *sin* invocar el blocklist loader
    #    (evitamos verify_jwt_in_request() para gestionar el bloqueo de IP manual)
    # -------------------------------------------------------------------------
    try:
        # decode_token valida firma y expiración, devuelve el payload
        claims = decode_token(token)
        user_id = claims["sub"]           # asunción: el 'sub' es el ID de usuario
    except Exception as e:
        # Token inválido o expirado
        return make_response(
            jsonify({"valid": False, "error": str(e)}),
            401
        )

    # Obtenemos la IP del cliente (función propia)
    current_ip = get_client_ip()
    cache_key  = f"token:{token}"

    # -------------------------------------------------------------------------
    # 2a) Intento rápido en Redis: si ya estaba cacheado, renovamos TTL y OK
    # -------------------------------------------------------------------------
    # 2a) intento rápido en Redis: comprueba token y binding de IP
    try:
        ttl = int(app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
        if redis_client.exists(cache_key):
            # extraer el JTI del token actual
            claims = get_jwt()
            jti = claims["jti"]
            binding_key = f"token_ip:{jti}"
            stored_ip = redis_client.get(binding_key)
            current_ip = get_client_ip()

            if stored_ip == current_ip:
                # renovamos ambos TTL
                redis_client.expire(cache_key, ttl)
                redis_client.expire(binding_key, ttl)
                resp = make_response(
                    jsonify({"valid": True, "user_id": user_id}),
                    200
                )
                resp.json = lambda: resp.get_json()
                return resp
            # mismatch de IP → revocamos
            resp = make_response(
                jsonify({"valid": False, "error": "IP mismatch — token revoked"}),
                401
            )
            resp.json = lambda: resp.get_json()
            return resp
    except Exception:
        # si falla Redis, caemos al fallback de Postgres
        pass

    # -------------------------------------------------------------------------
    # 2b) Fallback a token‑db: comprobamos que el token aún exista en la tabla
    # -------------------------------------------------------------------------
    conn = get_token_db_conn()
    cur  = conn.cursor()
    cur.execute(
        "SELECT issued_ip FROM recipy.jwt_tokens WHERE token = %s;",
        (token,)
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        # Token revocado o nunca existió
        return make_response(
            jsonify({"valid": False, "error": "revoked or missing"}),
            401
        )

    # -------------------------------------------------------------------------
    # 2c) Verificación del binding de IP
    # -------------------------------------------------------------------------
    issued_ip = row[0]
    if current_ip != issued_ip:
        # Cambio brusco de IP → revocamos el token
        return make_response(
            jsonify({"valid": False, "error": "IP mismatch — token revoked"}),
            401
        )

    # -------------------------------------------------------------------------
    # 2d) Token válido y IP coincide: recacheamos en Redis (opcional) y OK
    # -------------------------------------------------------------------------
    try:
        redis_client.setex(cache_key, ttl, user_id)
    except Exception:
        # Ignoramos fallos de Redis
        pass

    return make_response(
        jsonify({"valid": True, "user_id": user_id}),
        200
    )



if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
