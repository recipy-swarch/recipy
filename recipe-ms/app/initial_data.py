
from app.schema import Recipe

def get_initial_recipes() -> list[dict]:
    return [
        {
          "title": "Spaghetti Bolognese",
          "prep_time": "30 min",
          "description": "description 1",
          "images": ["spaghetti1.jpg", "spaghetti2.jpg"],
          "video": "spaghetti_bolognese.mp4",
          "portions": 4,
          "steps": ["Boil pasta.", "Cook meat.", "Mix together."],
          "user_id": 1
        },
        {
          "title": "Grilled Cheese Sandwich",
          "description": "description 2",
          "prep_time": "10 min",
          "video": None,
          "portions": 2,
          "steps": ["Butter bread.", "Add cheese.", "Grill."],
          "user_id": 1
        },
        {
          "title": "Pancakes",
          "description": "description 3",
          "prep_time": "15 min",
          "images": None,
          "video": "pancakes.mp4",
          "portions": 3,
          "steps": ["Mix ingredients.", "Fry both sides."],
          "user_id": 1
        },
    ]
