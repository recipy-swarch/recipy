# app/cache_client.py
import os
import httpx
from typing import Any, Optional

CACHE_API = os.getenv("CACHE_API_URL", "http://cache-api:8001")
_client = httpx.AsyncClient(timeout=3.0)

async def cache_get(key: str) -> Optional[Any]:
    """
    Llama a GET /cache/{key}.
    Devuelve el objeto (JSON) o None si 404.
    """
    resp = await _client.get(f"{CACHE_API}/cache/{key}")
    if resp.status_code == 200:
        return resp.json()
    if resp.status_code == 404:
        return None
    resp.raise_for_status()

async def cache_set(key: str, value: Any, ttl: int) -> None:
    """
    Llama a POST /cache con {key, value, ttl}.
    """
    payload = {"key": key, "value": value, "ttl": ttl}
    resp = await _client.post(f"{CACHE_API}/cache", json=payload)
    resp.raise_for_status()

async def cache_del(key: str) -> None:
    """
    Llama a DELETE /cache/{key}.
    """
    resp = await _client.delete(f"{CACHE_API}/cache/{key}")
    if resp.status_code not in (204, 404):
        resp.raise_for_status()
