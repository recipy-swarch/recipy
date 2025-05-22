import os
import pytest
from app import app as flask_app
from dotenv import load_dotenv

@pytest.fixture
def client(tmp_path, monkeypatch):
    # Carga variables de entorno del .env
    load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))
    flask_app.config["TESTING"] = True
    return flask_app.test_client()

def test_register_and_login_and_profile(client):
    # 1. Registro
    resp = client.post("/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "username": "testuser",
        "password": "pass123"
    })
    assert resp.status_code == 201
    assert resp.json["message"] == "User registered"

    # 2. Login
    resp = client.post("/login", json={
        "username": "testuser",
        "password": "pass123"
    })
    assert resp.status_code == 200
    token = resp.json.get("token")
    assert token is not None

    # 3. Get Profile
    resp = client.get("/profile", headers={
        "Authorization": f"Bearer {token}"
    })
    assert resp.status_code == 200
    data = resp.json
    assert data["username"] == "testuser"
    assert "password_hash" not in data

    # 4. Update Profile
    resp = client.put("/profile", json={
        "location": "Bogotá"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json["location"] == "Bogotá"
