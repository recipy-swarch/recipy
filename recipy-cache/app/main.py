import os, json
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Any, Optional
from app.db import redis
from dotenv import load_dotenv
app = FastAPI(title="recipe-cache")
load_dotenv()  # carga REDIS_URL, DEFAULT_CACHE_TTL, API_URL, etc.

# 1. Monta el directorio static (css/js/img) en /static
app.mount("/static", StaticFiles(directory="static"), name="static")

# 2. Configura Jinja2 para servir plantillas desde static/
templates = Jinja2Templates(directory="static")

# 3. Index: renderiza index.html injectando variables de entorno
@app.get("/", response_class=HTMLResponse)
async def ui(request: Request):
    # lee la API_URL que te servirá para hacer fetch desde el front
    api_url = os.getenv("API_URL", "http://localhost:8001")
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "API_URL": api_url,
        }
    )

# Tu health
@app.get("/health", status_code=status.HTTP_200_OK)
async def health():
    return {"status": "ok"}

class CacheItem(BaseModel):
    key: str
    value: Any
    ttl: Optional[int] = None

DEFAULT_TTL = int(os.getenv("DEFAULT_CACHE_TTL", 60))

@app.get("/cache/{key}")
async def get_cache(key: str):
    """Recupera el valor JSON almacenado en Redis bajo 'key'."""
    raw = await redis.get(key)
    if raw is None:
        raise HTTPException(status_code=404, detail="Key not found")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Si no era JSON válido, lo devolvemos como string
        return raw

@app.post("/cache", status_code=status.HTTP_201_CREATED)
async def set_cache(item: CacheItem):
    """
    Guarda 'value' bajo 'key' con TTL opcional.
    'value' se serializa a JSON antes de guardar.
    """
    ttl = item.ttl if item.ttl is not None else DEFAULT_TTL
    payload = json.dumps(item.value)
    await redis.set(item.key, payload, ex=ttl)
    return {"key": item.key, "ttl": ttl}

@app.delete("/cache/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cache(key: str):
    """Elimina la clave de Redis."""
    deleted = await redis.delete(key)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Key not found")
    return

