from typing import List
from app.schema import Recipe

recipes: List[Recipe] = []

def load_initial_data():
    global recipes
    recipes = [
        Recipe(
            id=1,
            title="Spaghetti Bolognese",
            prep_time="30 min",
            video="spaghetti_bolognese.mp4",
            portions=4,
            steps=[
                "Boil pasta.",
                "Cook meat.",
                "Mix together."
            ],
            user_id= "usuario123",
        ),
        Recipe(
            id=2,
            title="Grilled Cheese Sandwich",
            prep_time="10 min",
            video=None,
            portions=2,
            steps=[
                "Butter bread.",
                "Add cheese.",
                "Grill."
            ],
            user_id= "usuario1213"
        ),
        Recipe(
            id=3,
            title="Pancakes",
            prep_time="15 min",
            images=None,
            video="pancakes.mp4",
            portions=3,
            steps=[
                "Mix ingredients.",
                "Fry both sides."
            ],
            user_id= "usuario1213"
        ),
    ]
