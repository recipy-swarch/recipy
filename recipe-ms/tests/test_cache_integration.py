# Ejecutar este archivo de pruebas desde la terminal así:
#cd recipe-ms
#pytest tests/test_cache_integration.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def test_client():
    # ensure the app is running with initial data seeded
    yield client

def test_get_recipes_cache_miss_then_hit(test_client):
    # First request: cache miss
    response = test_client.get("/graphql/get_recipes")
    assert response.status_code == 200
    assert response.headers.get("X-Cache") == "MISS"
    data1 = response.json()
    assert isinstance(data1, list)
    assert len(data1) >= 1

    # Second request: cache hit
    response2 = test_client.get("/graphql/get_recipes")
    assert response2.status_code == 200
    assert response2.headers.get("X-Cache") == "HIT"
    data2 = response2.json()
    assert data2 == data1

@pytest.mark.parametrize("user_id", ["1"])
def test_get_recipes_by_user_cache_miss_then_hit(test_client, user_id):
    # First request: miss
    response = test_client.get(f"/graphql/get_recipebyuserNA?user_id={user_id}")
    assert response.status_code == 200
    assert response.headers.get("X-Cache") == "MISS"
    data1 = response.json()
    assert isinstance(data1, list)

    # Second request: hit
    response2 = test_client.get(f"/graphql/get_recipebyuserNA?user_id={user_id}")
    assert response2.status_code == 200
    assert response2.headers.get("X-Cache") == "HIT"
    data2 = response2.json()
    assert data2 == data1

def test_create_recipe_invalidates_cache(test_client):
    # Create a new recipe (assumes user_id=1 seeded)
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
    # POST create
    response = test_client.post("/graphql/create_recipe", json=payload)
    assert response.status_code == 201
    new_recipe = response.json()
    assert new_recipe.get("id")

    # After creation, global feed should be MISS again
    resp_feed = test_client.get("/graphql/get_recipes")
    assert resp_feed.headers.get("X-Cache") == "MISS"

    # And user feed should also MISS
    resp_user = test_client.get(f"/graphql/get_recipebyuserNA?user_id=1")
    assert resp_user.headers.get("X-Cache") == "MISS"

    # Clean up: (optionally delete created recipe)
    # client.delete(...) if implemented
    # Tras cada ejecución del test no dejar datos residuales en MongoDB ni en Redis
