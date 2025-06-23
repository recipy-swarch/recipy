# app/utils.py
from typing import List, Tuple, Dict, Any
from app.schema import Recipe

def prepare_recipes(
    raw_docs: List[Dict[str, Any]],
    ensure_fields: Dict[str, Any] = None
) -> Tuple[List[Dict[str, Any]], List[Recipe]]:
    """
    Transforma raw_docs de Mongo en:
      - data_to_cache: lista de dicts JSON-serializables
      - models: lista de Recipe(**doc)

    ensure_fields: pares clave:valor para setdefault() en cada doc.
    """
    data_to_cache = []
    models = []
    for doc in raw_docs:
        # _id → id
        doc["id"] = str(doc.pop("_id"))

        # Asegurar campos opcionales por defecto
        if ensure_fields:
            for field, default in ensure_fields.items():
                doc.setdefault(field, default)

        # Construcción del dict plano para cache
        data_to_cache.append({
            "id":          doc["id"],
            "user_id":     doc.get("user_id"),
            "title":       doc.get("title"),
            "description": doc.get("description"),
            "prep_time":   doc.get("prep_time"),
            "portions":    doc.get("portions"),
            "steps":       doc.get("steps"),
            "images":      doc.get("images"),
            "video":       doc.get("video"),
        })

        # Instancia Recipe para la respuesta
        models.append(Recipe(**doc))

    return data_to_cache, models
