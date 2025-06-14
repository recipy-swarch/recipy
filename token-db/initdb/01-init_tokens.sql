-- 1. Esquema opcional
CREATE SCHEMA IF NOT EXISTS recipy;
SET search_path = recipy;

-- 2. Tabla para almacenar JWT emitidos
CREATE TABLE jwt_tokens (
  id         SERIAL PRIMARY KEY,
  token      TEXT      NOT NULL,
  user_id INT NOT NULL,
  issued_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_jwt_tokens_user  ON jwt_tokens(user_id);
CREATE INDEX idx_jwt_tokens_token ON jwt_tokens(token);
