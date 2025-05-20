# 1. Hereda de la imagen oficial de PostgREST
FROM postgrest/postgrest:v13.0.0

# 2. Directorio de trabajo (opcional)
WORKDIR /etc

# 3. Copia tu archivo de configuración al contenedor
COPY postgrest.conf /etc/postgrest.conf

# 4. Expone el puerto por defecto de PostgREST
EXPOSE 3000

# 5. Define el comando de inicio leyendo el config
CMD ["postgrest", "/etc/postgrest.conf"]