from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter
from app.schema import Query, Mutation
from app.data import load_initial_data
import strawberry

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)

app = FastAPI()
app.include_router(graphql_app, prefix="/graphql")

load_initial_data()
