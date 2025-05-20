from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from app.schema import Query, Mutation
from app.data import load_initial_data
from app.db import client
import strawberry

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)

app = FastAPI(title="Recipe Service")
app.include_router(graphql_app, prefix="/graphql")

@app.on_event("startup")
async def on_startup():
    # 1. Ping a MongoDB
    try:
        await client.admin.command("ping")
        print("MongoDB conectado correctamente.")
    except Exception as e:
        print("Error conectando a MongoDB:", e)
        raise

    # 2. Carga de datos iniciales en memoria
    load_initial_data()
    print("Datos iniciales cargados en memoria.")