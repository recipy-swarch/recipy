from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
import strawberry

from app.schema import Query, Mutation
from app.db import client, get_collection
from app.initial_data import get_initial_recipes
from app.data import load_initial_data  # tu función que pobla la lista en memoria

# 1. Definir el esquema
schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)

# 2. Crear la app e incluir el router
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
