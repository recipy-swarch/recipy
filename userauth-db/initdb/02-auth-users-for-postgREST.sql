-- 1. Rol para acceso web anonimo (solo lectura)

BEGIN;
    create role web_anon nologin;

    grant usage on schema recipy to web_anon;
    grant select on recipy.users to web_anon;

    create role authenticator noinherit login password 'password_t';
    grant web_anon to authenticator;
COMMIT;

-- 2. Rol autenticado (inserción y actualización)
BEGIN;
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'password_t';
  GRANT web_anon TO authenticator;

  -- Permisos para crear usuarios (register) y editar perfil
  GRANT INSERT ON recipy."user" TO authenticator;
  GRANT UPDATE ON recipy."user" TO authenticator;
COMMIT;