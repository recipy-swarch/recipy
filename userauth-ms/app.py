# userauth-ms/app.py

import os
import datetime
import requests
import jwt
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from auth import hash_password, verify_password, create_token, decode_token
from dotenv import load_dotenv

# Carga variables de entorno de ../.env
load_dotenv()

app = Flask(__name__)
CORS(app)

# URL de PostgREST (userauth-postgrest)
PGRST = os.getenv("PGRST_URL", "").rstrip("/")  # ej: http://userauth-postgrest:3000
HEADERS = {"Content-Type": "application/json"}

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))


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

    token = create_token(user["id"])
    return jsonify({"token": token})


def auth_required(fn):
    """
    Decorador para endpoints que requieren JWT válido.
    Extrae el campo 'sub' como request.user_id.
    """
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        parts = auth.split()
        if len(parts) != 2 or parts[0] != "Bearer":
            abort(401, description="Missing or malformed token")
        try:
            payload = decode_token(parts[1])
        except jwt.ExpiredSignatureError:
            abort(401, description="Token expired")
        except Exception:
            abort(401, description="Invalid token")
        request.user_id = payload["sub"]
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


@app.route("/profile", methods=["GET", "PUT"])
@auth_required
def profile():
    uid = request.user_id

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


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
