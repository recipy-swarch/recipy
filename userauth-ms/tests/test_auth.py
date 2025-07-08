import os
import psycopg2
import pytest
from app import app as flask_app
from dotenv import load_dotenv

@pytest.fixture
def client():
    # Carga variables de entorno desde el archivo .env
    load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))
    flask_app.config["TESTING"] = True
    return flask_app.test_client()

def get_token_db_conn():
    """
    Conexión a la base de datos de tokens para verificar el issued_ip.
    """
    return psycopg2.connect(
        host=os.getenv("TOKEN_DB_HOST", "localhost"),
        port=int(os.getenv("TOKEN_DB_PORT", "5434")),
        dbname=os.getenv("TOKEN_DB_NAME", "recipy"),
        user=os.getenv("TOKEN_DB_USER", "postgres"),
        password=os.getenv("TOKEN_DB_PASSWORD", "")
    )


def test_register_and_login_and_profile(client):
    # 1. Registro de usuario
    resp = client.post(
        "/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "username": "testuser",
            "password": "pass123"
        }
    )
    assert resp.status_code == 201
    assert resp.json.get("message") == "User registered"

    # 2. Login desde una IP específica
    login_resp = client.post(
        "/login",
        json={"username": "testuser", "password": "pass123"},
        environ_overrides={"REMOTE_ADDR": "192.168.0.77"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json.get("token")
    assert token is not None

    # *** Nueva comprobación: verificar en la base de datos que issued_ip coincide ***
    conn = get_token_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT issued_ip FROM recipy.jwt_tokens WHERE token = %s",
        (token,)
    )
    issued_ip = cur.fetchone()[0]
    cur.close()
    conn.close()
    assert issued_ip == "192.168.0.77"

    # 3. Acceso al perfil con la misma IP (debe ser exitoso)
    profile_resp = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "192.168.0.77"}
    )
    assert profile_resp.status_code == 200
    data = profile_resp.json
    assert data.get("username") == "testuser"
    assert "password_hash" not in data

    # 4. Actualización de perfil (ubicación)
    update_resp = client.put(
        "/profile",
        json={"location": "Bogotá"},
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "192.168.0.77"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json.get("location") == "Bogotá"


def test_token_binding_rejects_on_ip_change(client):
    # Login desde localhost
    resp = client.post(
        "/login",
        json={"username": "testuser", "password": "pass123"},
        environ_overrides={"REMOTE_ADDR": "127.0.0.1"}
    )
    assert resp.status_code == 200
    token = resp.json.get("token")

    # Petición válida con la misma IP
    r_ok = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "127.0.0.1"}
    )
    assert r_ok.status_code == 200

    # Petición desde otra IP distinta (debe rechazarse)
    r_bad = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.5"}
    )
    assert r_bad.status_code == 401
    # Verificar mensaje de error: token inválido o mismatch de IP
    err_msg = r_bad.json.get("msg") or r_bad.json.get("error", "")
    assert "Token inválido" in err_msg or "IP mismatch" in err_msg


def test_validate_endpoint_token_binding(client):
    # Login con IP consistente
    login_resp = client.post(
        "/login",
        json={"username": "testuser", "password": "pass123"},
        environ_overrides={"REMOTE_ADDR": "127.0.0.1"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json.get("token")

    # Validación OK desde la misma IP
    r1 = client.get(
        "/validate",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "127.0.0.1"}
    )
    assert r1.status_code == 200
    assert r1.json().get("valid") is True

    # Validación FAIL por IP distinta
    r2 = client.get(
        "/validate",
        headers={"Authorization": f"Bearer {token}"},
        environ_overrides={"REMOTE_ADDR": "10.0.0.5"}
    )
    assert r2.status_code == 401
    assert "IP mismatch" in r2.json().get("error", "")
