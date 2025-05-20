import os
import datetime
import requests
import jwt
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Carga variables de entorno de ../.env
load_dotenv()

app = Flask(__name__)

# URL de PostgREST (userauth-postgrest)
POSTGREST_URL = os.getenv("POSTGREST_URL")  # ej: http://userauth-db:3000
# Secreto para firmar JWT
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = int(os.getenv("JWT_EXP_HOURS", "24"))


def create_jwt(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


@app.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    for f in ("name", "email", "username", "password"):
        if not data.get(f):
            return jsonify({"error": f"Missing field {f}"}), 400

    # Hashea la contraseña
    password_hash = generate_password_hash(data["password"])
    payload = {
        "name": data["name"],
        "email": data["email"],
        "username": data["username"],
        "password_hash": password_hash
    }
    # Inserta vía PostgREST
    r = requests.post(f"{POSTGREST_URL}/user", json=payload)
    if r.status_code not in (200, 201):
        return jsonify({"error": "Could not register", "detail": r.text}), r.status_code
    return jsonify({"message": "User registered"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing credentials"}), 400

    # Obtiene el usuario por username
    r = requests.get(f"{POSTGREST_URL}/user?username=eq.{data['username']}")
    if r.status_code != 200 or not r.json():
        return jsonify({"error": "Invalid username or password"}), 401

    user = r.json()[0]
    if not check_password_hash(user["password_hash"], data["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_jwt(user["id"])
    return jsonify({"token": token})


@app.route("/profile", methods=["GET"])
def get_profile():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401

    token = auth.split(" ", 1)[1]
    try:
        payload = decode_jwt(token)
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401

    user_id = payload["user_id"]
    # Llamada a PostgREST incluyendo el JWT en la cabecera
    headers = {
        "Authorization": f"Bearer {token}"
    }
    r = requests.get(
        f"{POSTGREST_URL}/user?id=eq.{user_id}",
        headers=headers
    )
    if r.status_code != 200 or not r.json():
        return jsonify({"error": "User not found"}), 404

    user = r.json()[0]
    # No exponemos password_hash
    user.pop("password_hash", None)
    return jsonify(user)


@app.route("/profile", methods=["PUT"])
def update_profile():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing token"}), 401
    try:
        payload = decode_jwt(auth.split(" ", 1)[1])
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401

    user_id = payload["user_id"]
    data = request.json or {}
    # Campos permitidos para editar
    allowed = {"profile_picture", "biography", "location", "birth_date"}
    update = {k: v for k, v in data.items() if k in allowed}
    if not update:
        return jsonify({"error": "No valid fields to update"}), 400

    # Patch a PostgREST, enviando también el JWT para que PostgREST sepa quién es el usuario
    headers = {
        "Authorization": f"Bearer {auth.split(' ',1)[1]}",   # el token extraído antes
        "Prefer": "return=representation"
    }
    r = requests.patch(
        f"{POSTGREST_URL}/user?id=eq.{user_id}",
        json=update,
        headers=headers
    )

    if r.status_code not in (200, 204):
        return jsonify({"error": "Update failed", "detail": r.text}), r.status_code

    # Devuelve el recurso actualizado (PostgREST regresa JSON)
    updated = r.json()[0] if r.json() else {}
    updated.pop("password_hash", None)
    return jsonify(updated)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)
