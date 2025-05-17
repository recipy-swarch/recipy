FROM python:latest

WORKDIR /app
COPY requirements.txt requirements.txt

RUN pip3 install --no-cache-dir -r requirements.txt
COPY . .

VOLUME /app/app

EXPOSE 8000

CMD [ "fastapi", "dev", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]