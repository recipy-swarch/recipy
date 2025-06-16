#!/bin/sh

# Validar que API_GATEWAY_URL esté definido
if [ -z "$API_GATEWAY_URL" ]; then
  echo "ERROR: API_GATEWAY_URL no está definido"
  exit 1
fi

# Sustituir variables
envsubst '${API_GATEWAY_URL}' < /etc/nginx/conf.d/default.conf.template \
  | sed 's/\\\$/\$/g' > /etc/nginx/conf.d/default.conf

# Mostrar resultado
cat /etc/nginx/conf.d/default.conf

# Ejecutar nginx
exec nginx -g 'daemon off;'
