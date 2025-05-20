-- 0. Activar pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Rol para acceso web anónimo (solo lectura)
BEGIN;
    -- rol que PostgREST usará para peticiones “anon”
    CREATE ROLE web_anon NOLOGIN;

    -- esquema y permisos básicos de solo lectura
    GRANT USAGE ON SCHEMA recipy TO web_anon;
    GRANT SELECT ON ALL TABLES IN SCHEMA recipy TO web_anon;
COMMIT;


-- 2. Rol autenticado (login)
BEGIN;
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'password_t';
    -- hereda permisos de solo lectura
    GRANT web_anon TO authenticator;
COMMIT;


-- 3. Función RPC para registro de usuarios
--    Se ejecuta como dueño de la función (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION recipy.register_user(
    _name     TEXT,
    _email    TEXT,
    _username TEXT,
    _password TEXT
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
GRANT EXECUTE ON FUNCTION recipy.register_user(
    TEXT, TEXT, TEXT, TEXT
) TO web_anon;
GRANT EXECUTE ON FUNCTION recipy.register_user(
    TEXT, TEXT, TEXT, TEXT
) TO authenticator;

