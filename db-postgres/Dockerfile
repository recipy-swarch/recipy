# Usamos la imagen oficial de PostgreSQL
FROM postgres:17.5

# Definimos la ubicación donde se guardarán los datos en el contenedor
VOLUME /var/lib/postgresql/data

COPY ./init.sql /docker-entrypoint-initdb.d/

# Exponemos el puerto por defecto de PostgreSQL
EXPOSE 5432
