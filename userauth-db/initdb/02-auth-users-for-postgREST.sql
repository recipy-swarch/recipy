/*
-- ALTER TABLE recipy.users ENABLE ROW LEVEL SECURITY;  -- para futuros prototipos


-- 0.2. Política: cada usuario sólo puede actualizar su propia fila (RLS futuro)
CREATE POLICY users_update_own
  ON recipy.users
  FOR UPDATE
  TO web_anon
  USING ( id = current_setting('request.jwt.claims.sub')::int );

-- Grant que permitiría aplicar la política
GRANT UPDATE ON recipy.users TO web_anon;
*/

-- 0. Activa la extensión de cifrado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Crea el rol web_anon y dale permisos de lectura + update
BEGIN;
  -- rol que usará PostgREST para peticiones sin token
  CREATE ROLE web_anon NOLOGIN;

  -- permisos en el esquema
  GRANT USAGE ON SCHEMA recipy TO web_anon;

  -- permisos en tablas
  GRANT SELECT ON ALL TABLES IN SCHEMA recipy TO web_anon;
  GRANT UPDATE ON recipy.users TO web_anon;
COMMIT;

-- 2. Crear el rol authenticator y hereda web_anon
BEGIN;
  CREATE ROLE authenticator LOGIN PASSWORD 'password_t';
  GRANT web_anon TO authenticator;
COMMIT;

-- 3. Función RPC para registro de usuarios
--    Se ejecuta como dueño de la función (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION recipy.register_user(
    _email    TEXT,
    _name     TEXT,
    _password TEXT,
    _username TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO recipy.users(
        name,
        email,
        username,
        password_hash
    ) VALUES (
        _name,
        _email,
        _username,
        crypt(_password, gen_salt('bf'))
    );
END;
$$;

-- 4. Conceder permiso de ejecución de la función
GRANT EXECUTE
  ON FUNCTION recipy.register_user(TEXT, TEXT, TEXT, TEXT)
  TO web_anon, authenticator;

