import strawberry
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.db import get_collection
import os, jwt
from fastapi import HTTPException

# ————————————————
# Helper de Auth
# ————————————————
def get_current_user_id(info) -> str:
    req = info.context["request"]
    auth = req.headers.get("authorization") or req.headers.get("x-user-id")
    if not auth:
        raise HTTPException(status_code=401, detail="Authentication required")
    # si vino x-user-id, lo devolvemos tal cual:
    if not auth.lower().startswith("bearer"):
        return auth  # asume que es un user_id directo
    # si vino Bearer token, lo validamos:
    token = auth.split()[1]
    try:
        payload = jwt.decode(
          token,
          os.getenv("JWT_SECRET", "change-me"),
          algorithms=[os.getenv("JWT_ALGO", "HS256")],
          options={
            "require_sub": True,
            "verify_aud": False   # ← DESACTIVAR la verificación de "aud"
          }
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return str(payload["sub"])

# -------------------------
# Tipos de dominio
# -------------------------

@strawberry.type
class Recipe:
    id: str
    title: str
    prep_time: str
    images: Optional[List[str]] = None
    video: Optional[str] = None
    portions: int
    steps: List[str]

@strawberry.input
class RecipeInput:
    title: str
    prep_time: str
    images: Optional[List[str]] = None
    video: Optional[List[str]] = None
    portions: int
    steps: List[str]

@strawberry.type
class Comment:
    id: str
    recipe_id: str
    user_id: str
    content: str
    parent_id: Optional[str]
    created_at: str

@strawberry.type
class Like:
    id: str
    recipe_id: str
    user_id: str
    created_at: str

# -------------------------
# Resolutores de consulta
# -------------------------

@strawberry.type
class Query:

    @strawberry.field
    async def recipes(self) -> List[Recipe]:
        coll = get_collection("recipes")
        raw_docs = await coll.find({}).to_list(100)
        recipes: List[Recipe] = []
        for doc in raw_docs:
            # Mapear _id -> id y eliminar el campo interno
            doc["id"] = str(doc.pop("_id"))
            recipes.append(Recipe(**doc))
        return recipes

    @strawberry.field
    async def recipe(self, id: str) -> Optional[Recipe]:
        coll = get_collection("recipes")
        # Buscar por ObjectId
        doc = await coll.find_one({"_id": ObjectId(id)})
        if not doc:
            return None
        doc["id"] = str(doc.pop("_id"))
        return Recipe(**doc)

    @strawberry.field
    async def comments(self, recipe_id: str) -> List[Comment]:
        coll = get_collection("comments")
        raw = await coll.find({"recipe_id": recipe_id, "parent_id": None}).to_list(100)
        comments: List[Comment] = []
        for doc in raw:
            doc["id"] = str(doc.pop("_id"))
            comments.append(Comment(**doc))
        return comments

    @strawberry.field
    async def replies(self, comment_id: str) -> List[Comment]:
        coll = get_collection("comments")
        raw = await coll.find({"parent_id": comment_id}).to_list(50)
        replies: List[Comment] = []
        for doc in raw:
            doc["id"] = str(doc.pop("_id"))
            replies.append(Comment(**doc))
        return replies

    # (Opcional) Query para listar “me gusta” de una receta
    @strawberry.field
    async def likes(self, recipe_id: str) -> List[Like]:
        coll = get_collection("likes")
        raw = await coll.find({"recipe_id": recipe_id}).to_list(100)
        likes: List[Like] = []
        for doc in raw:
            doc["id"] = str(doc.pop("_id"))
            likes.append(Like(**doc))
        return likes

# -------------------------
# Resolutores de mutación
# -------------------------

@strawberry.type
class Mutation:

    @strawberry.mutation
    async def add_recipe(self, info, recipe: RecipeInput) -> Recipe:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")
        # Insertar
        res = await coll.insert_one(recipe.__dict__)
        print("Insertado:", res.inserted_id)
        # Leer de vuelta el documento
        doc = await coll.find_one({"_id": res.inserted_id})
        # Mapear _id → id y limpiar
        doc["id"] = str(doc.pop("_id"))
        return Recipe(**doc)

    @strawberry.mutation
    async def update_recipe(self, info, id: str, recipe: RecipeInput) -> Optional[Recipe]:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")
        await coll.update_one({"_id": ObjectId(id)}, {"$set": recipe.__dict__})
        doc = await coll.find_one({"_id": ObjectId(id)})
        if not doc:
            return None
        doc["id"] = str(doc.pop("_id"))
        return Recipe(**doc)

    @strawberry.mutation
    async def delete_recipe(self, info, id: str) -> bool:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")
        res = await coll.delete_one({"_id": ObjectId(id)})
        return res.deleted_count == 1

    @strawberry.mutation
    async def add_comment(
        self,
        info,
        recipe_id: str,
        content: str,
        parent_id: Optional[str] = None
    ) -> Comment:
        user_id = get_current_user_id(info)
        coll = get_collection("comments")
        # Insertar
        res = await coll.insert_one({
            "recipe_id": recipe_id,
            "user_id": user_id,
            "content": content,
            "parent_id": parent_id,
            "created_at": datetime.utcnow().isoformat()
        })
        # Leer de vuelta
        doc = await coll.find_one({"_id": res.inserted_id})
        # Mapear _id → id y limpiar
        doc["id"] = str(doc.pop("_id"))
        return Comment(**doc)



    @strawberry.mutation
    async def like_recipe(self, info, recipe_id: str) -> Like:
        user_id = get_current_user_id(info)
        coll = get_collection("likes")
        # Insertar el like
        res = await coll.insert_one({
            "recipe_id": recipe_id,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        })
        # Leer de vuelta el documento completo
        doc = await coll.find_one({"_id": res.inserted_id})
        # Mapear _id → id y eliminar el campo interno
        doc["id"] = str(doc.pop("_id"))
        return Like(**doc)
