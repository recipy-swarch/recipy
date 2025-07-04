# userauth‑ms/tests/conftest.py

import os
import sys
import pytest
import importlib.util
import psycopg2
from dotenv import load_dotenv

# ----------------------------------------------------------------------------
# Si Flask no está instalado, saltamos todos estos tests
# ----------------------------------------------------------------------------
if importlib.util.find_spec("flask") is None:
    pytest.skip(
        "Flask no instalado: omitiendo tests de userauth‑ms",
        allow_module_level=True
    )

# ----------------------------------------------------------------------------
# Asegura que la aplicación principal esté en el PYTHONPATH
# ----------------------------------------------------------------------------
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

# ----------------------------------------------------------------------------
# Carga variables de entorno desde .env
# ----------------------------------------------------------------------------
load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))

# ----------------------------------------------------------------------------
# Fuerza las URLs y credenciales locales de PostgREST y Postgres
# ----------------------------------------------------------------------------
os.environ["PGRST_URL"] = os.getenv("PGRST_URL_LOCAL", "http://localhost:3001")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_DB", os.getenv("POSTGRES_DB", "userauth_db"))
os.environ.setdefault("POSTGRES_USER", os.getenv("POSTGRES_USER", "postgres"))
os.environ.setdefault("POSTGRES_PASSWORD", os.getenv("POSTGRES_PASSWORD", ""))
os.environ.setdefault("TOKEN_DB_HOST", "localhost")
os.environ.setdefault("TOKEN_DB_PORT", "5434")
os.environ.setdefault("TOKEN_DB_NAME", os.getenv("TOKEN_DB_NAME", "token_db"))
os.environ.setdefault("TOKEN_DB_USER", os.getenv("TOKEN_DB_USER", "postgres"))
os.environ.setdefault("TOKEN_DB_PASSWORD", os.getenv("TOKEN_DB_PASSWORD", ""))

# ----------------------------------------------------------------------------
# 1) Limpiar tabla de usuarios **una sola vez** al inicio de pytest
#    Para que el primer POST /register siempre sea 201
# ----------------------------------------------------------------------------
@pytest.fixture(scope="session", autouse=True)
def clean_users_table_once():
    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST"),
        port=int(os.getenv("POSTGRES_PORT")),
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
    )
    try:
        cur = conn.cursor()
        cur.execute("TRUNCATE recipy.users RESTART IDENTITY CASCADE;")
        conn.commit()
    finally:
        conn.close()

# ----------------------------------------------------------------------------
# 2) Dummy RabbitMQ: evita llamadas reales a pika.BlockingConnection
# ----------------------------------------------------------------------------
class DummyConnection:
    def __init__(self, params): pass
    def channel(self): return self
    def queue_declare(self, *args, **kwargs): pass
    def basic_publish(self, *args, **kwargs): pass
    def close(self): pass

@pytest.fixture(autouse=True)
def disable_rabbitmq(monkeypatch):
    try:
        import pika
    except ImportError:
        return  # Si no está pika, no hay que parchear
    monkeypatch.setattr(pika, "BlockingConnection", DummyConnection)

# ----------------------------------------------------------------------------
# 3) Dummy Redis: parchea redis.Redis.from_url para que no intente conectar
# ----------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def disable_redis(monkeypatch):
    try:
        import redis
    except ImportError:
        return  # Si no está redis instalado, omitimos
    class DummyRedis:
        def __init__(self, *args, **kwargs): pass
        def get(self, k): return None
        def setex(self, k, t, v): pass
        def exists(self, k): return False
        def delete(self, k): pass
        def expire(self, k, t): pass
    # Parcheamos la clase y el método from_url
    monkeypatch.setattr(redis, "Redis", DummyRedis)
    monkeypatch.setattr(
        redis,
        "from_url",
        classmethod(lambda cls, *args, **kwargs: DummyRedis())
    )

# ----------------------------------------------------------------------------
# 4) Antes de cada test, vaciamos SOLO la tabla de tokens JWT
# ----------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def clean_tokens_table():
    conn = psycopg2.connect(
        host=os.getenv("TOKEN_DB_HOST"),
        port=int(os.getenv("TOKEN_DB_PORT")),
        dbname=os.getenv("TOKEN_DB_NAME"),
        user=os.getenv("TOKEN_DB_USER"),
        password=os.getenv("TOKEN_DB_PASSWORD"),
    )
    try:
        cur = conn.cursor()
        cur.execute("TRUNCATE recipy.jwt_tokens RESTART IDENTITY CASCADE;")
        conn.commit()
    finally:
        conn.close()
