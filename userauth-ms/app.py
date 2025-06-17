import os
import json
import requests
from flask import Flask, request, jsonify, abort
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
    verify_jwt_in_request,
    JWTManager,
)
from redis import Redis

# 1) Cargamos variables de entorno de .env antes de cualquier configuración
load_dotenv()

# 2) Configuración de Redis (usa REDIS_URL o los valores REDIS_HOST / REDIS_PORT)
redis_client = Redis.from_url(
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
CORS(app)

# 5) Configuración de PostgREST para gestión de usuarios
PGRST = os.getenv("PGRST_URL", "").rstrip("/")  # ej: http://userauth-postgrest:3000
HEADERS = {"Content-Type": "application/json"}

# 6) Configuración de JWT
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET", "change-me")
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    hours=int(os.getenv("JWT_EXP_HOURS", "24"))
)
jwt = JWTManager(app)


def get_token_db_conn():
    """
    Conexión a la base de datos de tokens (token-db).
    """
    return psycopg2.connect(
        host="token-db",
        port=5432,
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

    # 2. Crear JWT y guardarlo en token-db
    token = create_access_token(identity=user["id"])
    exp = datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
    conn = get_token_db_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO recipy.jwt_tokens (token, user_id, expires_at) VALUES (%s, %s, %s);",
        (token, user["id"], exp)
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


@app.route("/profile", methods=["GET", "PUT"])
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
    return jsonify({"id": str(get_jwt_identity())})


@jwt.expired_token_loader
def my_expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        "error": "Token expirado",
        "detail": "Por favor, vuelve a iniciar sesión."
    }), 401


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
    Valida que el JWT enviado en Authorization:
      1) tenga firma y expiración válidas (Flask-JWT-Extended),
      2) siga activo (no revocado) en Redis o, en su defecto, en token-db.
    """
    # 1) Verificar firma y expiración con flask-jwt-extended
    try:
        verify_jwt_in_request()
        # get_jwt_identity devuelve el 'sub' del token (user_id)
        identity = get_jwt_identity()
    except Exception as e:
        # Firma inválida o token expirado
        return jsonify({"valid": False, "error": str(e)}), 401

    # Extraer el token crudo desde la cabecera Authorization
    token = request.headers.get("Authorization", "").split("Bearer ")[-1]

    # 2.a) Intentar validar en caché Redis
    try:
        # redis_client es instancia de Redis()
        if redis_client.exists(f"token:{token}"):
            return jsonify({"valid": True, "user_id": identity}), 200
    except Exception as e:
        app.logger.warning(f"Redis error en validate: {e}")

    # 2.b) Fallback: validar en token-db (PostgreSQL)
    conn = get_token_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM recipy.jwt_tokens WHERE token = %s;",
        (token,)
    )
    exists = cur.fetchone() is not None
    conn.close()

    if not exists:
        # Token ha sido revocado o no existe
        return jsonify({"valid": False, "error": "revoked or missing"}), 401

    # Token válido y activo
    return jsonify({"valid": True, "user_id": identity}), 200


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
