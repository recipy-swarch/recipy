# tests/test_cache_integration.py

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def test_client():
    # Arranca TestClient con startup/shutdown y seed de datos
    with TestClient(app) as client:
        # Inyectamos todas las cabeceras que tu código espera:
        client.headers.update({
            "x-user-id": "1",
            "Authorization": "1",
            "id": "1"
        })
        yield client

def test_get_recipes_cache_miss_then_hit(test_client):
    # Primera llamada: cache MISS
    response = test_client.get("/graphql/get_recipes")
    assert response.status_code == 200
    assert response.headers.get("X-Cache") == "MISS"
    data1 = response.json()
    assert isinstance(data1, list)
    assert len(data1) >= 1

    # Segunda llamada: cache HIT
    response2 = test_client.get("/graphql/get_recipes")
    assert response2.status_code == 200
    assert response2.headers.get("X-Cache") == "HIT"
    data2 = response2.json()
    assert data2 == data1

@pytest.mark.parametrize("user_id", ["1"])
def test_get_recipes_by_user_cache_miss_then_hit(test_client, user_id):
    # Primera llamada por usuario: MISS
    response = test_client.get(f"/graphql/get_recipebyuserNA?user_id={user_id}")
    assert response.status_code == 200
    assert response.headers.get("X-Cache") == "MISS"
    data1 = response.json()
    assert isinstance(data1, list)

    # Segunda llamada por usuario: HIT
    response2 = test_client.get(f"/graphql/get_recipebyuserNA?user_id={user_id}")
    assert response2.status_code == 200
    assert response2.headers.get("X-Cache") == "HIT"
    data2 = response2.json()
    assert data2 == data1

def test_create_recipe_invalidates_cache(test_client):
    # Creamos una nueva receta (usa user_id=1 de las cabeceras)
    payload = {
        "title": "Test Recipe",
        "description": "desc",
        "prep_time": "5 min",
        "images": None,
        "video": None,
        "portions": 1,
        "steps": ["step1"],
        "user_id": 1
    }

    # POST a create_recipe → ahora debe devolver 201 Created
    response = test_client.post("/graphql/create_recipe", json=payload)
    assert response.status_code == 201
    new_recipe = response.json()
    assert new_recipe.get("id")

    # Tras crear, el feed global debería ser MISS de nuevo
    resp_feed = test_client.get("/graphql/get_recipes")
    assert resp_feed.headers.get("X-Cache") == "MISS"

    # Y el feed por usuario también debería ser MISS
    resp_user = test_client.get(f"/graphql/get_recipebyuserNA?user_id=1")
    assert resp_user.headers.get("X-Cache") == "MISS"
