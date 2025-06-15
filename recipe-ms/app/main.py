from dotenv import load_dotenv
load_dotenv()   # <- esto importa las JWT_SECRET y JWT_ALGO desde .env

from strawberry.fastapi import GraphQLRouter
import strawberry

from app.schema import Query, Mutation
from app.db import client, get_collection
from app.initial_data import get_initial_recipes
from app.data import load_initial_data  # función que pobla la lista en memoria
from fastapi import FastAPI, Request, HTTPException, Body, status
from typing import List
from app.db import get_collection
from app.schema import Recipe  # tu dataclass Strawberry
from app.schema import get_current_user_id  # tu helper
from datetime import datetime
from bson import ObjectId

# 1. Definir el esquema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# 2. Definimos un context_getter tipado para que FastAPI inyecte Request
def get_context(request: Request):
    return {"request": request}

graphql_app = GraphQLRouter(
    schema=schema,
    graphiql=True,               # opcional: habilitar GraphiQL en /graphql
    allow_queries_via_get=True,  # <-- permite consultas GET
    context_getter=get_context   # <-- use nuestra función con tipo Request
)

app = FastAPI(title="Recipe Service")
app.include_router(graphql_app, prefix="/graphql")

# 3. Startup hook para Mongo + datos iniciales
@app.on_event("startup")
async def on_startup():
    try:
        # a) Chequeo de conexión
        await client.admin.command("ping")
        print("MongoDB conectado correctamente.")

        # b) Sembrar en la colección si está vacía
        coll = get_collection("recipes")
        count = await coll.count_documents({})
        if count == 0:
            docs = get_initial_recipes()
            await coll.insert_many(docs)
            print(f"Sembradas {len(docs)} recetas iniciales en MongoDB.")

    except Exception as e:
        print("Error conectando o sembrando MongoDB:", e)
        raise

    # c) Carga en memoria de tu lista Python
    load_initial_data()
    print("Datos iniciales cargados en memoria.")

@app.get("/graphql/get_recipes", response_model=List[Recipe])
async def get_recipes(request: Request):
    coll = get_collection("recipes")
    raw_docs = await coll.find({}).to_list(100)

    recipes: List[Recipe] = []
    for doc in raw_docs:
        doc["id"] = str(doc.pop("_id"))

        # Asegurar campos obligatorios
        doc.setdefault("user_id", "")
        doc.setdefault("description", "")  # <- Asegura que exista

        recipes.append(Recipe(**doc))
    return recipes


@app.get("/graphql/get_recipebyuser", response_model=List[Recipe])
async def get_recipes_by_user(request: Request):
    # 1) Extraer user_id del header (x-user-id o Authorization)
    try:
        # Creamos un “pseudo-info” para reusar tu helper
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        # Si no viene auth o es inválida, devolvemos 401
        raise e

    # 2) Consultar Mongo
    coll = get_collection("recipes")
    raw_docs = await coll.find({"user_id": user_id}).to_list(100)

    # 3) Mapear ObjectId y generar instancias de Recipe
    recipes: List[Recipe] = []
    for doc in raw_docs:
        doc["id"] = str(doc.pop("_id"))
        recipes.append(Recipe(**doc))

    return recipes

@app.post("/graphql/create_recipe", response_model=Recipe)
async def create_recipe(request: Request, payload: dict = Body(...)):
    # 1) Autenticación / extracción de user_id
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
        print("Encontramos user_id:", user_id)
    except HTTPException as e:
        raise e

    # 2) Leer campos obligatorios y opcionales
    title     = payload.get("title")
    description     = payload.get("description")
    prep_time = payload.get("prep_time")
    portions  = payload.get("portions")
    steps     = payload.get("steps")
    images    = payload.get("images", None)
    video     = payload.get("video", None)
    

    # (Opcional: validar que title, prep_time, portions y steps no sean None)

    # 3) Insertar en Mongo
    doc = {
        "user_id":   user_id,
        "title":     title,
        "description": description,
        "prep_time": prep_time,
        "portions":  portions,
        "steps":     steps,
        "images":    images,
        "video":     video,
    }

    print("Receta a insertar:", doc)

    coll = get_collection("recipes")

    print("Colección de recetas:", coll)

    res = await coll.insert_one(doc)

    print("Insertado:", res.inserted_id)

    # 4) Leer de vuelta y mapear _id → id
    saved = await coll.find_one({"_id": res.inserted_id})
    saved["id"] = str(saved.pop("_id"))
    return Recipe(**saved)

@app.delete(
    "/graphql/delete_recipebyuser",
    response_model=List[Recipe],
    responses={
        400: {"description": "Bad Request: recipe_id inválido o ausente"},
        401: {"description": "Unauthorized"},
        404: {"description": "Not Found: no existe o no te pertenece"}
    },
    status_code=status.HTTP_200_OK
)
async def delete_recipe_by_user(request: Request):
    # 1) Extraer user_id
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    # 2) Leer recipe_id
    recipe_id = request.query_params.get("recipe_id")
    if not recipe_id:
        raise HTTPException(400, detail="Falta el parámetro `recipe_id`")

    # 3) Validar ObjectId
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")

    coll = get_collection("recipes")

    # 4) Borrar condicional por user_id
    res = await coll.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, detail="Receta no encontrada o no te pertenece")

    # 5) Devolver las recetas restantes de ese usuario
    docs = await coll.find({"user_id": user_id}).to_list(100)
    remaining: List[Recipe] = []
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
        remaining.append(Recipe(**doc))

    return remaining


@app.put(
    "/graphql/update_recipebyuser",
    response_model=Recipe,
    responses={
        400: {"description": "Bad Request: recipe_id inválido o body vacío"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden: no eres el autor"},
        404: {"description": "Not Found: receta no existe"}
    },
    status_code=status.HTTP_200_OK
)
async def update_recipe_by_user(request: Request):
    # 1) Autenticación
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    # 2) Leer recipe_id de query
    recipe_id = request.query_params.get("recipe_id")
    if not recipe_id:
        raise HTTPException(400, detail="Falta el parámetro `recipe_id`")
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")

    # 3) Leer payload JSON
    body = await request.json()
    # filtrar solo campos válidos
    allowed = {"title", "prep_time", "portions", "steps", "images", "video"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(400, detail="No hay campos válidos para actualizar")

    coll = get_collection("recipes")

    # 4) Verificar existencia y autoría
    doc = await coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, detail="Receta no existe")
    if str(doc.get("user_id", "")) != user_id:
        raise HTTPException(403, detail="No puedes editar esta receta")

    # 5) Aplicar update
    await coll.update_one({"_id": oid}, {"$set": update_data})

    # 6) Leer y devolver actualizado
    updated = await coll.find_one({"_id": oid})
    updated["id"] = str(updated.pop("_id"))
    # asegúrate de que user_id siga en el dict
    if "user_id" not in updated:
        updated["user_id"] = user_id
    return Recipe(**updated)

