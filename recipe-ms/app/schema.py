import strawberry
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.db import get_collection
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import jwt
from app.cache_client import cache_del

class CommentOut(BaseModel):
    id: str
    recipe_id: str = Field(..., alias="recipe_id")
    user_id: str   = Field(..., alias="user_id")
    content: str
    parent_id: Optional[str]    = Field(None, alias="parent_id")
    created_at: str             = Field(..., alias="created_at")

class CommentWithRepliesOut(CommentOut):
    replies: List[CommentOut]

# ————————————————
# Helper de Auth
# ————————————————

def get_current_user_id(info) -> str:
    """
    Extrae el Bearer token de Authorization, lo valida y devuelve el sub.
    """
    req = info.context["request"]
    auth: str | None = req.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET", ""),
            algorithms=[os.getenv("JWT_ALGO", "HS256")]
        )
        return str(payload.get("sub"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
# -------------------------
# Tipos de dominio
# -------------------------

@strawberry.type
class Recipe:
    id: str
    title: str
    description: str
    prep_time: str
    images: Optional[List[str]] = None
    video: Optional[str] = None
    portions: int
    steps: List[str]
    user_id: str

@strawberry.input
class RecipeInput:
    title: str
    description: str
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

    @strawberry.field
    async def replies(self) -> List["Comment"]:
        coll = get_collection("comments")
        raw = await coll.find({"parent_id": self.id}).to_list(100)
        out: List[Comment] = []
        for doc in raw:
            # 1) Mapea el _id
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("recipe_id", self.recipe_id)
            doc.setdefault("user_id", "")
            doc.setdefault("parent_id", doc.get("parent_id"))
            doc.setdefault("created_at", "")
            #  finalmente construye el Comment
            out.append(Comment(**doc))
        return out


@strawberry.type
class Like:
    id: str
    recipe_id: str
    user_id: str
    created_at: str

@strawberry.type
class LikeCount:
    count: int

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
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("description", "")
            doc.setdefault("user_id", "unknown")
            # Aseguramos que steps es siempre un array
            if not isinstance(doc.get("steps"), list):
            doc["steps"] = []
            recipes.append(Recipe(**doc))
        return recipes

    @strawberry.field
    async def recipe(self, id: str) -> Optional[Recipe]:
        coll = get_collection("recipes")
        doc = await coll.find_one({"_id": ObjectId(id)})
        if not doc:
            return None
        doc["id"] = str(doc.pop("_id"))
        doc.setdefault("description", "")
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

    # Lista de likes para una receta
    @strawberry.field
    async def likes(self, recipe_id: str) -> List[Like]:
        coll = get_collection("likes")
        raw = await coll.find({"recipe_id": recipe_id}).to_list(100)
        likes: List[Like] = []
        for doc in raw:
            doc["id"] = str(doc.pop("_id"))
            likes.append(Like(**doc))
        return likes

    # (Opcional) Sólo el conteo de likes
    @strawberry.field
    async def likesCount(self, recipe_id: str) -> LikeCount:
        coll = get_collection("likes")
        cnt = await coll.count_documents({"recipe_id": recipe_id})
        return LikeCount(count=cnt)

    @strawberry.field
    async def recipes_by_user(self, user_id: str) -> List[Recipe]:
        coll = get_collection("recipes")
        raw_docs = await coll.find({"user_id": user_id}).to_list(100)
        recipes: List[Recipe] = []
        for doc in raw_docs:
            doc["id"] = str(doc.pop("_id"))
            doc.setdefault("description", "")
            doc.setdefault("user_id", user_id)
            # Igual aquí: garantizamos que steps sea lista
            if not isinstance(doc.get("steps"), list):
                doc["steps"] = []
            recipes.append(Recipe(**doc))
        return recipes

# -------------------------
# Resolutores de mutación
# -------------------------

@strawberry.type
class Mutation:

    @strawberry.mutation
    async def add_recipe(self, info, recipe: RecipeInput) -> Recipe:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")

        # inserción en Mongo
        doc = recipe.__dict__
        doc["user_id"] = user_id
        res = await coll.insert_one(doc)

        # obtén el documento recién creado
        new = await coll.find_one({"_id": res.inserted_id})
        new["id"] = str(new.pop("_id"))

        # —>> INVALIDAMOS EL CACHE GLOBAL Y EL POR USUARIO
        await cache_del("recipes:feed")
        await cache_del(f"recipes:user_feed:{user_id}")

        return Recipe(**new)


    @strawberry.mutation
    async def update_recipe(self, info, id: str, recipe: RecipeInput) -> Optional[Recipe]:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")
        oid = ObjectId(id)
        # Verificar autor
        orig = await coll.find_one({"_id": oid})
        if not orig:
            return None
        if str(orig.get("user_id")) != user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        update_data = recipe.__dict__
        await coll.update_one({"_id": oid}, {"$set": update_data})
        doc = await coll.find_one({"_id": oid})
        doc["id"] = str(doc.pop("_id"))
        return Recipe(**doc)

    @strawberry.mutation
    async def delete_recipe(self, info, id: str) -> bool:
        user_id = get_current_user_id(info)
        coll = get_collection("recipes")
        oid = ObjectId(id)
        res = await coll.delete_one({"_id": oid, "user_id": user_id})
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
        res = await coll.insert_one({
            "recipe_id": recipe_id,
            "user_id": user_id,
            "content": content,
            "parent_id": parent_id,
            "created_at": datetime.utcnow().isoformat()
        })
        doc = await coll.find_one({"_id": res.inserted_id})
        doc["id"] = str(doc.pop("_id"))
        return Comment(**doc)
    @strawberry.mutation
    async def delete_comment(
        self,
        info,
        comment_id: str
    ) -> bool:
        user_id = get_current_user_id(info)

        # 1) Validar ID
        try:
            oid = ObjectId(comment_id)
        except Exception:
            raise HTTPException(status_code=400, detail="`comment_id` inválido")

        coll = get_collection("comments")
        # 2) Intentar borrar solo si coincide user_id
        res = await coll.delete_one({"_id": oid, "user_id": user_id})
        if res.deleted_count == 0:
            # o no existe o no eres autor
            raise HTTPException(status_code=404, detail="Comentario no encontrado o no tienes permiso")

        return True
    @strawberry.mutation
    async def update_comment(
        self,
        info,
        comment_id: str,
        content: str
    ) -> Comment:
        user_id = get_current_user_id(info)

        # 1) Validar ID
        try:
            oid = ObjectId(comment_id)
        except Exception:
            raise HTTPException(status_code=400, detail="`comment_id` inválido")

        coll = get_collection("comments")
        # 2) Recuperar el comentario
        doc = await coll.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Comentario no existe")
        # 3) Verificar autoría
        if doc.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="No puedes editar este comentario")

        # 4) Actualizar el contenido y la fecha (opcional)
        await coll.update_one(
            {"_id": oid},
            {"$set": {
                "content": content,
                # podrías también actualizar un campo `updated_at`: datetime.utcnow().isoformat()
            }}
        )

        # 5) Leer de vuelta y devolver
        updated = await coll.find_one({"_id": oid})
        updated["id"] = str(updated.pop("_id"))
        return Comment(**updated)

    # Dar like
    @strawberry.mutation
    async def likeRecipe(self, info, recipe_id: str) -> Like:
        user_id = get_current_user_id(info)
        coll = get_collection("likes")
        # 1) Evitar duplicados
        if await coll.find_one({"recipe_id": recipe_id, "user_id": user_id}):
            raise HTTPException(status_code=409, detail="Already liked")
        # 2) Insertar
        res = await coll.insert_one({
            "recipe_id": recipe_id,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        })
        doc = await coll.find_one({"_id": res.inserted_id})
        doc["id"] = str(doc.pop("_id"))
        return Like(**doc)

    # Quitar like
    @strawberry.mutation
    async def unlikeRecipe(self, info, recipe_id: str) -> bool:
        user_id = get_current_user_id(info)
        coll = get_collection("likes")
        res = await coll.delete_one({"recipe_id": recipe_id, "user_id": user_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Like not found")
        return True