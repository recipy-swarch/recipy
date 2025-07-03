-- 3. Depuración de tokens anteriores sin issued_ip
--    (para entornos existentes: revocamos los JWT creados antes de habilitar Token Binding)
SET search_path = recipy;

DELETE FROM jwt_tokens
WHERE issued_ip = '';

'''
Esto revoca todos los JWT emitidos antes de habilitar Token Binding.
Tras aplicar la migración, los usuarios deberán volver a autenticarse
para obtener un token con su binding IP correctamente poblado.
'''