# userauth-ms/app.py

import os
import requests
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from datetime import timedelta
from auth import hash_password, verify_password
from dotenv import load_dotenv

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    JWTManager,
)

# Carga variables de entorno de ../.env
load_dotenv()

app = Flask(__name__)
CORS(app)

# URL de PostgREST (userauth-postgrest)
PGRST = os.getenv("PGRST_URL", "").rstrip("/")  # ej: http://userauth-postgrest:3000
HEADERS = {"Content-Type": "application/json"}

# JWT settings
# JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
# JWT_ALGORITHM = "HS256"
# JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))


app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET", "change-me")
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.getenv("JWT_EXP_HOURS", "24")))
jwt = JWTManager(app)


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

    # 1. Validación básica de campos obligatorios
    for field in ("name", "email", "username", "password"):
        if not data.get(field):
            return jsonify({"error": f"Falta campo {field}"}), 400

    # 2. Preparamos el payload para el RPC de PostgREST
    payload = {
        "_name":     data["name"],
        "_email":    data["email"],
        "_username": data["username"],
        "_password": data["password"],
    }

    # 3. Llamada al RPC register_user
    r = pg(
        "rpc/register_user",
        method="POST",
        headers=HEADERS,
        json=payload
    )

    # 4. Si todo va bien (200 OK o 204 No Content), devolvemos 201 Created
    if r.status_code in (200, 204):
        return jsonify({"message": "User registered"}), 201

    # 5. Manejo de claves duplicadas (username o email ya existe)
    if r.status_code in (409, 422):
        # PostgREST suele devolver un JSON con detalles o texto plano
        if r.headers.get("Content-Type", "").startswith("application/json"):
            detail = r.json().get("message", r.text)
        else:
            detail = r.text
        return jsonify({
            "error": "Username o email ya registrado",
            "detail": detail
        }), 409

    # 6. Para cualquier otro error, reenviamos el código y el mensaje original
    return abort(r.status_code, r.text)


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing credentials"}), 400

    # Traemos al usuario por username
    r = pg(f"users?username=eq.{data['username']}",
           headers={"Accept": "application/json"})
    if r.status_code != 200 or not r.json():
        return jsonify({"error": "Invalid username or password"}), 401

    user = r.json()[0]
    if not verify_password(data["password"], user["password_hash"]):
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_access_token(identity=user["id"])
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

    else:  # PUT
        update = request.json or {}
        # Campos permitidos para editar
        allowed = {"profile_picture", "biography", "location", "birth_date"}
        payload = {k: v for k, v in update.items() if k in allowed}
        if not payload:
            return jsonify({"error": "No valid fields to update"}), 400

        headers = {
            **HEADERS,
            "Prefer": "return=representation"
        }
        # Incluir el token en la cabecera para PostgREST
        token = request.headers.get("Authorization").split()[1]
        headers["Authorization"] = f"Bearer {token}"

        r = pg(f"users?id=eq.{uid}",
               method="PATCH",
               headers=headers,
               json=payload)

        if r.status_code not in (200, 204):
            return abort(r.status_code, description=r.text)

        # PostgREST en PUT con Prefer: return=representation devuelve lista
        updated = r.json()[0] if r.json() else {}
        updated.pop("password_hash", None)
        return jsonify(updated)

@app.route("/me", methods=["GET"])
@jwt_required()
def me():
    """
    Endpoint para obtener el id de usuario ('sub') del JWT enviado.
    """
    return jsonify({"id": str(get_jwt_identity())})

@jwt.expired_token_loader
def my_expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        "error": "Token expirado",
        "detail": "Por favor, vuelve a iniciar sesión."
    }), 401

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
