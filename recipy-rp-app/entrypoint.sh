#!/bin/sh

# Validar que WAF_URL esté definido
if [ -z "$WAF_URL" ]; then
  echo "ERROR: WAF_URL no está definido"
  exit 1
fi

# Sustituir variables
envsubst '${WAF_URL}' < /etc/nginx/conf.d/default.conf.template \
  | sed 's/\\\$/\$/g' > /etc/nginx/conf.d/default.conf

# Mostrar resultado
cat /etc/nginx/conf.d/default.conf

# Ejecutar nginx
exec nginx -g 'daemon off;'
