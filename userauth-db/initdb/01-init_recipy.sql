
-- 1. Esquema de la base de datos (opcional)
CREATE SCHEMA IF NOT EXISTS recipy;
SET search_path = recipy;

-- 2. Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(200) UNIQUE NOT NULL,
  creation_date   TIMESTAMP     DEFAULT NOW(),
  username        VARCHAR(50)   UNIQUE NOT NULL,  -- Nombre público en la plataforma
  profile_picture TEXT,                          -- URL de la imagen de perfil
  biography       TEXT,                          -- Descripción breve del usuario
  location        VARCHAR(100),                  -- Ciudad o país
  birth_date      DATE,                          -- Para segmentación y edad del usuario
  role            VARCHAR(50)   DEFAULT 'user',  -- Puede ser user, admin, chef, etc.
  password_hash   TEXT          NOT NULL         -- Contraseña en formato seguro
);

-- 3. Tabla de relaciones "siguiendo / seguido"
CREATE TABLE IF NOT EXISTS relation (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL,     -- quien sigue
  following_id  INT NOT NULL,     -- a quién sigue
  follow_date   TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_user
    FOREIGN KEY(user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_following
    FOREIGN KEY(following_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT unq_relation
    UNIQUE(user_id, following_id)  -- evita duplicados
);

-- 4. Índices para optimizar conteos
CREATE INDEX idx_relation_following
  ON relation(following_id);

CREATE INDEX idx_relation_user
  ON relation(user_id);
