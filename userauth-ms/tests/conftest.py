# userauth-ms/tests/conftest.py

import os
import sys
import pytest
import pika
import psycopg2
from dotenv import load_dotenv

# Asegura que el paquete principal esté en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Carga .env para tener POSTGRES_* y TOKEN_DB_* en os.environ
load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))

# --- Dummy para RabbitMQ (ya lo tenías) ---
class DummyConnection:
    def __init__(self, params): pass
    def channel(self): return self
    def queue_declare(self, *args, **kw): pass
    def basic_publish(self, *args, **kw): pass
    def close(self): pass

@pytest.fixture(autouse=True)
def disable_rabbitmq(monkeypatch):
    monkeypatch.setattr(pika, "BlockingConnection", DummyConnection)

# --- Nuevo fixture para limpiar las tablas antes de cada test ---
@pytest.fixture(autouse=True)
def clean_postgres_tables():
    # Conexión a userauth-db
    conn1 = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "userauth-db"),
        port=int(os.getenv("POSTGRES_PORT", 5432)),
        dbname=os.getenv("POSTGRES_DB", "recipy"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
    )
    # Conexión a token-db
    conn2 = psycopg2.connect(
        host=os.getenv("TOKEN_DB_HOST", "token-db"),
        port=int(os.getenv("TOKEN_DB_PORT", 5433)),
        dbname=os.getenv("TOKEN_DB_NAME", "token_db"),
        user=os.getenv("TOKEN_DB_USER"),
        password=os.getenv("TOKEN_DB_PASSWORD"),
    )

    try:
        for conn, truncs in (
            (conn1, [ 'TRUNCATE recipy."users" RESTART IDENTITY CASCADE;' ]),
            (conn2, [ 'TRUNCATE recipy.jwt_tokens RESTART IDENTITY CASCADE;' ]),
        ):
            cur = conn.cursor()
            for stmt in truncs:
                cur.execute(stmt)
            conn.commit()
            cur.close()
    finally:
        conn1.close()
        conn2.close()
