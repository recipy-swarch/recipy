# userauth-ms/auth.py
import os
import datetime
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGO   = "HS256"
JWT_EXP_HRS= int(os.getenv("JWT_EXP_HOURS", "24"))

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)

# def create_token(sub: int) -> str:
#     payload = {
#         "sub": str(sub),            # ← obligamos a que sea string
#         "role": "authenticator", # <-- rol de autenticados que definimos en PostgREST
#         "aud":  "postgrest",  # <<< coincide con jwt-aud en postgrest.conf
#         "exp":  datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXP_HRS)
#     }
#     return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

# def decode_token(token: str) -> dict:
#     return jwt.decode(
#         token,
#         JWT_SECRET,
#         algorithms=[JWT_ALGO],
#         audience="postgrest"              # <<< debe coincidir con jwt-aud
#     )

# def get_token_sub(token: str) -> int:
#     """
#     Devuelve el campo 'sub' (id de usuario) del JWT.
#     """
#     payload = decode_token(token)
#     return int(payload.get("sub"))

def test_register_duplicate(client):
    # Registro inicial
    client.post("/register", json={
        "name": "Dup",
        "email": "dup@example.com",
        "username": "dupuser",
        "password": "pass"
    })
    # Intento duplicado
    resp = client.post("/register", json={
        "name": "Dup",
        "email": "dup@example.com",
        "username": "dupuser",
        "password": "pass"
    })
    assert resp.status_code == 409
    assert "already" in resp.json.get("error","").lower()
