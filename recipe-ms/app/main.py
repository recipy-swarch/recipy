from strawberry.fastapi import GraphQLRouter
import strawberry
import os
import httpx
from app.schema import Query, Mutation, Comment, Recipe, get_current_user_id, Like
from app.db import client, get_collection
from app.initial_data import get_initial_recipes
from app.data import load_initial_data  
from fastapi import FastAPI, Request, HTTPException, Body, status, Response
from typing import List, Any, Dict
from app.db import get_collection
from datetime import datetime
from bson import ObjectId
from app.schema import CommentOut, CommentWithRepliesOut
from pydantic import BaseModel, Field
from app.cache_client import cache_get, cache_set,cache_del
from app.utils import prepare_recipes
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="recipe-ms")
COMMENTS_TTL = int(os.getenv("FEED_CACHE_TTL"))
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
async def get_recipes_by_userNA(request: Request, response: Response):
    user_id = request.query_params.get("user_id")
    if not user_id:
        raise HTTPException(400, "Debe indicar `user_id` como parámetro de consulta")

    cache_key = f"recipes:user_feed:{user_id}"
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [Recipe(**r) for r in cached]

    # Leer de Mongo
    coll = get_collection("recipes")
    raw_docs = await coll.find({"user_id": user_id}).to_list(100)

    # Transformar con helper
    data_to_cache, models = prepare_recipes(
        raw_docs,
        ensure_fields={"description": "", "user_id": user_id}
    )

    # Cache miss
    await cache_set(cache_key, data_to_cache, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"
    return models


@app.get("/graphql/get_recipes", response_model=List[Recipe])
async def get_recipes(request: Request, response: Response):
    cache_key = "recipes:feed"
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [Recipe(**r) for r in cached]

    coll = get_collection("recipes")
    raw_docs = await coll.find({}).to_list(100)

    data_to_cache, models = prepare_recipes(
        raw_docs,
        ensure_fields={"description": "", "user_id": ""}
    )

    await cache_set(cache_key, data_to_cache, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"
    return models
@app.get(
    "/graphql/recipes/{recipe_id}",
    response_model=Recipe,
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "OK: receta encontrada"},
        400: {"description": "Bad Request: recipe_id inválido"},
        404: {"description": "Not Found: receta no existe"},
    }
)
async def get_recipe_by_id(
    recipe_id: str,
    response: Response
) -> Any:
    cache_key = f"recipes:detail:{recipe_id}"

    # 1) Cache-hit
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return Recipe(**cached)

    # 2) Validar ID
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "`recipe_id` no es un ID válido")

    # 3) Leer Mongo
    coll = get_collection("recipes")
    doc = await coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Receta no encontrada")

    # 4) Mapear a Pydantic
    recipe_data: Dict[str, Any] = {
        "id": str(doc["_id"]),
        "images": doc.get("images", []),
        "video": doc.get("video"),
        "title": doc.get("title", ""),
        "steps": doc.get("steps", []),
        "prep_time": doc.get("prepTime", 0),
        "portions": doc.get("portions", 1),
        "description": doc.get("description", ""),
        "user_id": doc.get("user_id"),
    }

    # 5) Cache-miss: poblar Redis
    await cache_set(cache_key, recipe_data, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"
    return Recipe(**recipe_data)

@app.get(
    "/graphql/get_recipebyuser",
    response_model=List[Recipe]
)
async def get_recipes_by_user(
    request: Request,
    response: Response
):
    # 0) Autenticación (x-user-id o Authorization)
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    # clave de cache para este usuario
    cache_key = f"recipes:user_feed:{user_id}"

    # 1) Intentar cache-hit
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [Recipe(**r) for r in cached]

    # 2) Lectura desde Mongo
    coll = get_collection("recipes")
    raw_docs = await coll.find({"user_id": user_id}).to_list(100)

    # 3) Transformar con helper
    data_to_cache, models = prepare_recipes(
        raw_docs,
        ensure_fields={"user_id": user_id}
    )

    # 4) Cache-miss: poblar Redis
    await cache_set(cache_key, data_to_cache, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"
    return models


@app.post(
    "/graphql/create_recipe",
    response_model=Recipe,
    status_code=status.HTTP_201_CREATED
)
async def create_recipe(
    request: Request,
    payload: dict = Body(...)
):
    # 1) Autenticación
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e

    # 2) Lectura de campos
    title       = payload.get("title")
    description = payload.get("description")
    prep_time   = payload.get("prep_time")
    portions    = payload.get("portions")
    steps       = payload.get("steps")
    images      = payload.get("images", None)
    video       = payload.get("video", None)

    # (Aquí podrías validar que title, prep_time, portions y steps estén presentes)

    # 3) Insertar en Mongo
    coll = get_collection("recipes")
    res = await coll.insert_one({
        "user_id":    user_id,
        "title":      title,
        "description":description,
        "prep_time":  prep_time,
        "portions":   portions,
        "steps":      steps,
        "images":     images,
        "video":      video,
    })

    # 4) Leer y normalizar
    saved = await coll.find_one({"_id": res.inserted_id})
    saved["id"] = str(saved.pop("_id"))

    # 5) Invalidar cachés relevantes
    # - feed global
    await cache_del("recipes:feed")
    # - feed por usuario
    await cache_del(f"recipes:user_feed:{user_id}")

    # 6) Devolver la nueva receta
    return Recipe(**saved)


@app.post(
    "/graphql/comments_recipes",
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
    "/graphql/comments_recipes/{recipe_id}",
    response_model=List[Comment],
    responses={
        200: {"description": "OK: lista de comentarios"},
        400: {"description": "Bad Request: recipe_id inválido"},
        404: {"description": "Not Found: receta no existe"}
    }
)
async def get_comments_for_recipe(
    recipe_id: str,
    response: Response
):
    cache_key = f"recipes:comments:{recipe_id}"

    # 0) Intentamos cache-hit
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        # cached ya es una lista de dicts validos para Comment
        return [Comment(**c) for c in cached]

    # 1) Validar recipe_id
    try:
        _ = ObjectId(recipe_id)
    except:
        raise HTTPException(400, "`recipe_id` no es un ID válido")

    # 2) Verificar que la receta existe
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": ObjectId(recipe_id)}):
        raise HTTPException(404, "Receta no encontrada")

    # 3) Recuperar comentarios de Mongo
    coll_comments = get_collection("comments")
    raw = await coll_comments.find({"recipe_id": recipe_id}).to_list(100)

    # 4) Construir listas paralelas:
    comments_data = []
    comments_models = []
    for doc in raw:
        cdict = {
            "id": str(doc["_id"]),
            "recipe_id": doc["recipe_id"],
            "user_id": doc["user_id"],
            "content": doc["content"],
            "parent_id": doc.get("parent_id"),
            "created_at": doc["created_at"],
        }
        comments_data.append(cdict)             # -> para cache
        comments_models.append(Comment(**cdict))  # -> para la respuesta

    # 5) Cache‐miss: poblar Redis con los dicts puros
    await cache_set(cache_key, comments_data, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"

    return comments_models

@app.get(
    "/graphql/recipes/{recipe_id}/comments",
    response_model=List[CommentWithRepliesOut],
    responses={
        200: {"description": "OK: comentarios con sus replies"},
        400: {"description": "Bad Request: recipe_id inválido"},
        404: {"description": "Not Found: receta no existe"},
    },
    status_code=status.HTTP_200_OK
)
async def list_comments_with_replies(
    recipe_id: str,
    response: Response
):
    cache_key = f"recipes:comments_with_replies:{recipe_id}"

    # 0) Intentamos cache-hit
    cached = await cache_get(cache_key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return [CommentWithRepliesOut(**item) for item in cached]

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

    # 4) Construir listas paralelas: datos puros y modelos
    data_to_cache = []
    models: List[CommentWithRepliesOut] = []

    for doc in raw_comments:
        base = {
            "id": str(doc["_id"]),
            "recipe_id": doc["recipe_id"],
            "user_id": doc["user_id"],
            "content": doc["content"],
            "parent_id": doc.get("parent_id"),
            "created_at": doc["created_at"],
        }

        # 4a) Recuperar sus replies
        raw_replies = await coll_comments.find({"parent_id": base["id"]}).to_list(100)
        replies_data = [
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

        item_data = {**base, "replies": replies_data}
        data_to_cache.append(item_data)
        models.append(CommentWithRepliesOut(**item_data))

    # 5) Cache-miss: guardamos en cache-API
    await cache_set(cache_key, data_to_cache, COMMENTS_TTL)
    response.headers["X-Cache"] = "MISS"

    return models

@app.put(
    "/graphql/comments/{comment_id}",
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
    response: Response,
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

    # 6) Leer y normalizar resultado
    updated = await coll.find_one({"_id": oid})
    updated["id"] = str(updated.pop("_id"))

    # 7) Invalidar caché de esta receta
    recipe_id = updated["recipe_id"]
    key_list        = f"recipes:comments:{recipe_id}"
    key_with_replies = f"recipes:comments_with_replies:{recipe_id}"

    # borramos ambas claves
    await cache_del(key_list)
    await cache_del(key_with_replies)

    # opcional: exponer qué se invalidó
    response.headers["X-Cache-Invalidated"] = ",".join([key_list, key_with_replies])

    return CommentOut(**updated)

@app.delete(
    "/graphql/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "No Content: borrado OK"},
        400: {"description": "Bad Request: comment_id inválido"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden: no eres el autor"},
        404: {"description": "Not Found: comentario no existe"},
    }
)
async def rest_delete_comment(
    comment_id: str,
    request: Request,
    response: Response
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

    # 3) Recuperar antes de borrar para extraer recipe_id
    original = await coll.find_one({"_id": oid})
    if not original or original.get("user_id") != user_id:
        # cubre 404 y 403 en un solo chequeo
        raise HTTPException(404, detail="Comentario no existe o no tienes permiso")

    recipe_id = original["recipe_id"]

    # 4) Borrar
    await coll.delete_one({"_id": oid})

    # 5) Invalidar caché de lista y de with_replies
    key_list         = f"recipes:comments:{recipe_id}"
    key_with_replies = f"recipes:comments_with_replies:{recipe_id}"

    await cache_del(key_list)
    await cache_del(key_with_replies)

    # 6) Opcional: exponer claves invalidadas
    response.headers["X-Cache-Invalidated"] = f"{key_list},{key_with_replies}"

    # FastAPI responde 204 No Content
    return

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
@app.get(
    "/graphql/has_liked",
    response_model=bool,
    responses={
        400: {"description": "Bad Request: recipe_id inválido o ausente"},
        401: {"description": "Unauthorized"},
        404: {"description": "Not Found: receta no existe"}
    }
)
async def rest_has_liked(request: Request, recipe_id: str):
    # 1) Validar recipe_id presente
    if not recipe_id:
        raise HTTPException(400, detail="Falta el parámetro `recipe_id`")
    # 2) Validar formato ObjectId
    try:
        oid = ObjectId(recipe_id)
    except Exception:
        raise HTTPException(400, detail="`recipe_id` no es un ID válido")
    # 3) Verificar que exista la receta
    coll_recipes = get_collection("recipes")
    if not await coll_recipes.find_one({"_id": oid}):
        raise HTTPException(404, detail="Receta no existe")
    # 4) Autenticación: extraer user_id
    try:
        info = type("Info", (), {"context": {"request": request}})
        user_id = get_current_user_id(info)
    except HTTPException as e:
        raise e
    # 5) Consultar si ya hay like
    coll_likes = get_collection("likes")
    exists = await coll_likes.find_one({"recipe_id": recipe_id, "user_id": user_id})
    return bool(exists)