FROM postgres:17.5-alpine3.21

VOLUME /var/lib/postgresql/data

COPY ./initdb/01-init_tokens.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
