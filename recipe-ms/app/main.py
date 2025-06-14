from dotenv import load_dotenv
load_dotenv()   # <- esto importa las JWT_SECRET y JWT_ALGO desde .env

from strawberry.fastapi import GraphQLRouter
import strawberry

from app.schema import Query, Mutation
from app.db import client, get_collection
from app.initial_data import get_initial_recipes
from app.data import load_initial_data  # función que pobla la lista en memoria
from fastapi import FastAPI, Request, HTTPException, Body
from typing import List
from app.db import get_collection
from app.schema import Recipe  # tu dataclass Strawberry
from app.schema import get_current_user_id  # tu helper
from datetime import datetime
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


@app.get("/graphql/get_recipebyuserNA", response_model=List[Recipe])
async def get_recipes_by_userNA(request: Request):
    # 1) Leer user_id de query params en lugar de headers
    user_id = request.query_params.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe indicar `user_id` como parámetro de consulta"
        )


    # 2) Consultar Mongo por ese user_id
    coll = get_collection("recipes")
    raw_docs = await coll.find({"user_id": user_id}).to_list(100)


    # 3) Mapear ObjectId → id y asegurar description/user_id
    recipes: List[Recipe] = []
    for doc in raw_docs:
        doc["id"] = str(doc.pop("_id"))
        doc.setdefault("description", "")
        doc.setdefault("user_id", user_id)
        recipes.append(Recipe(**doc))


    return recipes





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