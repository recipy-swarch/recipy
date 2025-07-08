#!/bin/sh

# Validar que API_GATEWAY_URL esté definido
if [ -z "$FRONTEND_URL" ]; then
  echo "ERROR: FRONTEND_URL no está definido"
  exit 1
fi

# Sustituir variables
envsubst '${FRONTEND_URL}' < /etc/nginx/conf.d/default.conf.template \
  | sed 's/\\\$/\$/g' > /etc/nginx/conf.d/default.conf

# Mostrar resultado
cat /etc/nginx/conf.d/default.conf

# Ejecutar nginx
exec nginx -g 'daemon off;'
