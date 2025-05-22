FROM python:3.11-slim

WORKDIR /app

# asegurar de que Python busque en /app
ENV PYTHONPATH=/app

# Instalar dependencias nativas si hace falta
RUN apt-get update \
 && apt-get install -y gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["python", "app.py"]
