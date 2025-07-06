import requests
import time
import redis

# Configuración
RECIPE_ID = "686af5641ced45513dd9ce44"  # <-- usa un ID real
URL = f"http://localhost:8000/graphql/recipes/{RECIPE_ID}"
REDIS_HOST = "localhost"  # o "recipy-cache" si estás corriendo dentro de Docker
REDIS_PORT = 6379

# Crear cliente Redis
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Clave de caché
CACHE_KEY = f"recipes:detail:{RECIPE_ID}"

# 1. Borrar clave en Redis
deleted = redis_client.delete(CACHE_KEY)
print(f"🔄 Eliminando cache [{CACHE_KEY}]... Resultado: {'OK' if deleted else 'No existía'}\n")

print("🚀 Test: Cache-Aside en endpoint /recipes/{recipe_id}\n")

# 2. Primera solicitud (esperamos MISS)
start1 = time.time()
r1 = requests.get(URL)
t1 = time.time() - start1
print(f"1.    Primera respuesta: {r1.status_code} - X-Cache: {r1.headers.get('X-Cache')} - Tiempo: {t1:.3f}s")

# 3. Segunda solicitud (esperamos HIT)
start2 = time.time()
r2 = requests.get(URL)
t2 = time.time() - start2
print(f"2.    Segunda respuesta: {r2.status_code} - X-Cache: {r2.headers.get('X-Cache')} - Tiempo: {t2:.3f}s")

# 4. Verificación
if r1.headers.get("X-Cache") == "MISS" and r2.headers.get("X-Cache") == "HIT":
    print("\n✅ Cache-Aside funcionando correctamente 🎉")
else:
    print("\n❌ Cache-Aside podría estar fallando o no estar habilitado.")
