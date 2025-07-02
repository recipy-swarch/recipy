
# 1) Imagen base ultraligera con Python y Alpine
#FROM python:3.11-alpine

# 2) Variables de entorno útiles
#ENV PYTHONUNBUFFERED=1 \
#    PYTHONDONTWRITEBYTECODE=1

# 3) Instala OpenSSL (CLI + dev) y herramientas de compilación
#RUN apk update && \
#    apk add --no-cache \
      # OpenSSL runtime y utilidades
#      openssl \
#      ca-certificates \
      # Librerías de desarrollo para compilar extensiones Python que usen crypto/u otros C-modules
#      libressl-dev \
#     musl-dev \
#      gcc \
      # Libffi para muchos paquetes de cifrado
 #     libffi-dev && \
    # Actualiza el store de certificados
#    update-ca-certificates
FROM python:3.11-slim

WORKDIR /app

# 4) Copia requirements e instala dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5) Copia el código de tu micro-servicio
COPY . .

# 6) Expone el puerto y arranca Uvicorn
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
