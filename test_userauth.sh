#!/usr/bin/env bash
export PGRST_URL_LOCAL=http://localhost:3001
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export TOKEN_DB_HOST=localhost
export TOKEN_DB_PORT=5434

pytest userauth-ms/tests -q