import strawberry
from typing import List, Optional

@strawberry.type
class Recipe:
    id: int
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
    video: Optional[str] = None
    portions: int
    steps: List[str]

@strawberry.type
class Mutation:
    @strawberry.mutation
    def add_recipe(self, recipe: RecipeInput) -> Recipe:
        from app.data import recipes
        new_id = max((r.id for r in recipes), default=0) + 1
        new_recipe = Recipe(id=new_id, **recipe.__dict__)
        recipes.append(new_recipe)
        return new_recipe

    @strawberry.mutation
    def update_recipe(self, id: int, recipe: RecipeInput) -> Optional[Recipe]:
        from app.data import recipes
        for i, r in enumerate(recipes):
            if r.id == id:
                updated = Recipe(id=id, **recipe.__dict__)
                recipes[i] = updated
                return updated
        return None

    @strawberry.mutation
    def delete_recipe(self, id: int) -> bool:
        from app.data import recipes
        for i, r in enumerate(recipes):
            if r.id == id:
                recipes.pop(i)
                return True
        return False

@strawberry.type
class Query:
    @strawberry.field
    def recipes(self) -> List[Recipe]:
        from app.data import recipes
        return recipes

    @strawberry.field
    def recipe(self, id: int) -> Optional[Recipe]:
        from app.data import recipes
        return next((r for r in recipes if r.id == id), None)
