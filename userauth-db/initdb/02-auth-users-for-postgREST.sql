-- 1. Rol para acceso web anonimo (solo lectura)

BEGIN;
    create role web_anon nologin;

    grant usage on schema recipy to web_anon;
    grant select on recipy.users to web_anon;

    create role authenticator noinherit login password 'password_t';
    grant web_anon to authenticator;
COMMIT;

-- 2. Rol autenticado (lectura y escritura)
BEGIN;

COMMIT;