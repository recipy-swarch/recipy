FROM golang:1.21-alpine

# Instala git (necesario para resolver ciertos módulos)
RUN apk add --no-cache git

WORKDIR /app

# 1) Copia solo go.mod para aprovechar cache de dependencias
COPY go.mod ./
RUN go mod download

# 2) Copia el resto del código
COPY . .

# 3) Limpia go.mod, genera/actualiza go.sum y compila en un solo paso
RUN go mod tidy \
 && go build -o mail-ms .

# Comando por defecto
CMD ["./mail-ms"]
