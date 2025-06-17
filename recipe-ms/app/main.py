from strawberry.fastapi import GraphQLRouter
import strawberry
import os
import httpx
from app.schema import Query, Mutation, Comment, Recipe, get_current_user_id, Like
from app.db import client, get_collection
from app.initial_data import get_initial_recipes
from app.data import load_initial_data  
from fastapi import FastAPI, Request, HTTPException, Body, status, Response
from typing import List
from app.db import get_collection
from datetime import datetime
from bson import ObjectId
from app.schema import CommentOut, CommentWithRepliesOut
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="recipe-ms")

# Permite peticiones desde tu UI (puedes restringir el origen en prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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

class CommentWithReplies(Comment):
    replies: List[Comment]
class CommentUpdateIn(BaseModel):
    content: str = Field(..., min_length=1)

app = FastAPI(title="Recipe Service")
app.include_router(graphql_app, prefix="/graphql")

CACHE_API = os.getenv("CACHE_API_URL")
_http = httpx.AsyncClient(timeout=3.0)

async def cache_del(key: str):
    # llamas al DELETE de cache-api
    resp = await _http.delete(f"{CACHE_API}/cache/{key}")
    # opcionalmente ignoras 404
    if resp.status_code not in (204, 404):
        resp.raise_for_status()

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
@app.post(
    "/comments_recipes",
    response_model=Comment,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    request: Request,
    response: Response,
    payload: dict = Body(...),
):
    # 1) Autenticación / extracción de user_id
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    # 2) Leer y validar campos
    recipe_id = payload.get("recipe_id")
    content   = payload.get("content")
    parent_id = payload.get("parent_id", None)

    if not recipe_id or not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faltan campos obligatorios: recipe_id y content",
        )
    # Validar recipe_id como ObjectId
    try:
        oid = ObjectId(recipe_id)
    except:
        raise HTTPException(400, "`recipe_id` no es un ID válido")

    # 3) Verificar que la receta exista
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": oid}):
        raise HTTPException(404, "Receta no encontrada")

    # 4) Insertar el comentario en Mongo
    coll_comments = get_collection("comments")
    doc = {
        "recipe_id": recipe_id,
        "user_id":   user_id,
        "content":   content,
        "parent_id": parent_id,
        "created_at": datetime.utcnow(),
    }
    res = await coll_comments.insert_one(doc)

    # 5) Leer de vuelta y mapear _id → id
    saved = await coll_comments.find_one({"_id": res.inserted_id})
    saved["id"] = str(saved.pop("_id"))

    # 6) Invalidate cache de comments para esta receta
    cache_key = f"recipes:comments:{recipe_id}"
    await cache_del(cache_key)
    response.headers["X-Cache-Invalidated"] = cache_key
    # tras construir 'comments' como lista de dicts o Pydantic
    await cache_set(f"recipes:comments:{recipe_id}", [c.dict() for c in comments], COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"

    return Comment(**saved)
#obtener los comentarios de una receta
@app.get(
    "/comments_recipes/{recipe_id}",
    response_model=List[Comment],
    responses={
        200: {"description": "OK: lista de comentarios"},
        400: {"description": "Bad Request: recipe_id inválido"},
        404: {"description": "Not Found: receta no existe"}
    }
)
async def get_comments_for_recipe(recipe_id: str, request: Request):
    # 1) Validar recipe_id como ObjectId
    try:
        _ = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(status_code=400, detail="`recipe_id` no es un ID válido")
    
    # 2) Verificar que la receta existe (opcional, pero recomendado)
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": ObjectId(recipe_id)}):
        raise HTTPException(status_code=404, detail="Receta no encontrada")

    # 3) Recuperar comentarios
    coll_comments = get_collection("comments")
    raw = await coll_comments.find({"recipe_id": recipe_id}).to_list(100)

    comments: List[Comment] = []
    for c in raw:
        c["id"] = str(c.pop("_id"))
        comments.append(Comment(**c))

    return comments

@app.get(
    "/recipes/{recipe_id}/comments",
    response_model=List[CommentWithRepliesOut],
    responses={
        200: {"description": "OK: comentarios con sus replies"},
        400: {"description": "Bad Request: recipe_id inválido"},
        404: {"description": "Not Found: receta no existe"},
    },
    status_code=status.HTTP_200_OK
)
async def list_comments_with_replies(recipe_id: str):
    # 1) Validar recipe_id
    try:
        oid = ObjectId(recipe_id)
    except:
        raise HTTPException(400, "`recipe_id` no es un ID válido")

    # 2) Verificar receta existe
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": oid}):
        raise HTTPException(404, "Receta no encontrada")

    # 3) Obtener comentarios padre
    coll_comments = get_collection("comments")
    raw_comments = await coll_comments.find({
        "recipe_id": recipe_id,
        "parent_id": None
    }).to_list(100)

    results: List[CommentWithRepliesOut] = []
    for doc in raw_comments:
        # Normalizar el documento Mongo a dict Pydantic
        base = {
            "id": str(doc["_id"]),
            "recipe_id": doc["recipe_id"],
            "user_id": doc["user_id"],
            "content": doc["content"],
            "parent_id": doc.get("parent_id"),
            "created_at": doc["created_at"],
        }

        # 4) Recuperar sus replies
        raw_replies = await coll_comments.find({"parent_id": base["id"]}).to_list(100)
        replies = [
            {
                "id": str(r["_id"]),
                "recipe_id": r["recipe_id"],
                "user_id": r["user_id"],
                "content": r["content"],
                "parent_id": r.get("parent_id"),
                "created_at": r["created_at"],
            }
            for r in raw_replies
        ]

        # 5) Construir el Pydantic model
        results.append(CommentWithRepliesOut(**{**base, "replies": replies}))

    return results
# --- PUT  /comments/{comment_id} ---
@app.put(
    "/comments/{comment_id}",
    response_model=CommentOut,
    responses={
        200: {"description": "OK: comentario actualizado"},
        400: {"description": "Bad Request: comment_id inválido o body mal formado"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden: no eres el autor"},
        404: {"description": "Not Found: comentario no existe"},
    },
    status_code=status.HTTP_200_OK
)
async def rest_update_comment(
    comment_id: str,
    request: Request,
    payload: CommentUpdateIn
):
    # 1) Validar comment_id
    try:
        oid = ObjectId(comment_id)
    except:
        raise HTTPException(400, detail="`comment_id` no es un ID válido")

    # 2) Autenticación
    try:
        info    = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    coll = get_collection("comments")

    # 3) Recuperar el comentario
    original = await coll.find_one({"_id": oid})
    if not original:
        raise HTTPException(404, detail="Comentario no existe")

    # 4) Verificar autoría
    if original.get("user_id") != user_id:
        raise HTTPException(403, detail="No puedes editar este comentario")

    # 5) Actualizar contenido
    await coll.update_one(
        {"_id": oid},
        {"$set": {"content": payload.content}}
    )

    # 6) Leer y normalizar
    updated = await coll.find_one({"_id": oid})
    updated["id"] = str(updated.pop("_id"))
    return CommentOut(**updated)


# --- DELETE /comments/{comment_id} ---
@app.delete(
    "/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "No Content: borrado OK"},
        400: {"description": "Bad Request: comment_id inválido"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden: no eres el autor"},
        404: {"description": "Not Found: comentario no existe"},
    }
)
async def rest_delete_comment(comment_id: str, request: Request):
    # 1) Validar comment_id
    try:
        oid = ObjectId(comment_id)
    except:
        raise HTTPException(400, detail="`comment_id` no es un ID válido")

    # 2) Autenticación
    try:
        info    = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    coll = get_collection("comments")

    # 3) Borrar condicional por autor
    res = await coll.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, detail="Comentario no existe o no tienes permiso")

    # 4) FastAPI enviará 204 No Content automáticamente
    return

# — POST /graphql/like_recipe
@app.post(
    "/graphql/like_recipe",
    response_model=Like,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Bad Request: recipe_id inválido o ausente"},
        401: {"description": "Unauthorized"},
        404: {"description": "Not Found: receta no existe"},
        409: {"description": "Conflict: ya habías dado like"}
    }
)
async def rest_like_recipe(request: Request):
    # 1) Extraer recipe_id de query params
    recipe_id = request.query_params.get("recipe_id")
    if not recipe_id:
        raise HTTPException(400, detail="Falta el parámetro `recipe_id`")
    # 2) Validar ObjectId
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")
    # 3) Verificar receta existe
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": oid}):
        raise HTTPException(404, detail="Receta no existe")
    # 4) Autenticación
    try:
        info    = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e
    # 5) Evitar duplicados
    coll_likes = get_collection("likes")
    if await coll_likes.find_one({"recipe_id": recipe_id, "user_id": user_id}):
        raise HTTPException(409, detail="Already liked")
    # 6) Insertar
    res = await coll_likes.insert_one({
        "recipe_id":  recipe_id,
        "user_id":    user_id,
        "created_at": datetime.utcnow().isoformat()
    })
    doc = await coll_likes.find_one({"_id": res.inserted_id})
    doc["id"] = str(doc.pop("_id"))
    return Like(**doc)


# — DELETE /graphql/unlike_recipe
@app.delete(
    "/graphql/unlike_recipe",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        400: {"description": "Bad Request: recipe_id inválido o ausente"},
        401: {"description": "Unauthorized"},
        404: {"description": "Not Found: like no encontrado"}
    }
)
async def rest_unlike_recipe(request: Request):
    # 1) recipe_id
    recipe_id = request.query_params.get("recipe_id")
    if not recipe_id:
        raise HTTPException(400, detail="Falta el parámetro `recipe_id`")
    # 2) validar formato
    try:
        _ = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")
    # 3) autenticación
    try:
        info    = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e
    # 4) borrar
    coll_likes = get_collection("likes")
    res = await coll_likes.delete_one({"recipe_id": recipe_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, detail="Like not found")
    # 5) 204 No Content
    return


#  GET count via /graphql/likes_count
@app.get(
    "/graphql/likes_count",
    response_model=int,
    responses={
        400: {"description": "Bad Request: recipe_id inválido o ausente"},
        404: {"description": "Not Found: receta no existe"}
    }
)
async def rest_likes_count(recipe_id: str):
    # 1) validar id
    try:
        oid = ObjectId(recipe_id)
    except:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")
    # 2) existe receta?
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": oid}):
        raise HTTPException(404, detail="Receta no existe")
    # 3) contar
    coll_likes = get_collection("likes")
    cnt = await coll_likes.count_documents({"recipe_id": recipe_id})
    return cnt
