import os
from redis.asyncio import from_url, Redis
from dotenv import load_dotenv

load_dotenv()  # carga REDIS_URL desde .env

REDIS_URL = os.getenv("REDIS_URL", "redis://recipy-cache:6379/0")
redis: Redis = from_url(REDIS_URL, decode_responses=True)
