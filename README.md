# Recipy
<img width="480" height="480" alt="recipy-logo" src="https://github.com/user-attachments/assets/5942e40e-eb58-40c8-88d6-7d4df9920895" />
Red social de recetas culinarias basada en microservicios, con despliegue en Docker Compose y GKE.

---

## Table of Contents

1. [Equipo](#equipo)
2. [Descripción](#descripción)
3. [Arquitectura](#arquitectura)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Despliegue](#despliegue)
6. [Contribuidores](#contribuidores)

---

## Equipo

* Luis Alfonso Díaz Vergel
* Fabio Esteban Murcia Martínez
* Fernando Novoa Salazar
* Sergio Alexander Parada Amarillo
* John Andrés Rua Cortés
* Juan David Vásquez Pinzón

---

## Descripción

Recipy es una plataforma para compartir, descubrir y gestionar recetas.

* Registro y autenticación de usuarios con verificación por correo.
* Feed comunitario con “Me gusta” y comentarios.
* Creación de recetas (título, tiempo, ingredientes, pasos e imágenes).
* Caché Redis para acelerar lecturas frecuentes.
* API disponible desde web y app móvil.

---

## Arquitectura
<img width="668" height="861" alt="recipy-capas" src="https://github.com/user-attachments/assets/134d1b8b-a649-4f5a-89f4-431481282e26" />

### Microservicios & Patrones

* **Estilo Microservicios**
  Servicios independientes (usuarios, recetas, imágenes, correo, cache, tokens) con bases de datos aisladas (PostgreSQL, MongoDB, Redis).
* **API Gateway** (`recipy‑ag`)
  Unifica rutas, maneja autenticación y composición de respuestas.
* **Reverse‑Proxy** (`recipy-rp-frontend` / `recipy-rp-app`)
  NGINX para servir estáticos, cacheo y enrutamiento interno.
* **Event‑Driven** (RabbitMQ)
  `userauth-ms` publica eventos de registro → `mail-ms` envía correos.
* **Cache‑Aside**
  `recipe-ms` consulta primero Redis antes de MongoDB.
* **WAF** (`recipy‑waf`)
  NGINX + ModSecurity CRS para detección y bloqueo de ataques.

### Capas

1. **Presentación**: Web (Next.js) y móvil (React Native)
2. **Comunicación**: Reverse‑Proxy, WAF, API Gateway
3. **Lógica**: Microservicios (Flask, FastAPI, Go, ASP.NET Core, PostgREST)
4. **Datos**: PostgreSQL, MongoDB, Redis, volumen Docker

---

## Stack Tecnológico

| Componente                | Tecnología                   |
| ------------------------- | ---------------------------- |
| API Gateway               | NestJS                       |
| Servicio de recetas       | FastAPI + Strawberry GraphQL |
| Base de datos de recetas  | MongoDB + Motor              |
| Servicio de usuarios      | Flask + JWT                  |
| Base de datos de usuarios | PostgreSQL                   |
| Servicio de imágenes      | ASP.NET Core Web API         |
| Servicio de correo        | Go + SMTP + RabbitMQ         |
| WAF & Reverse‑Proxy       | NGINX + ModSecurity          |
| Front-end web             | Next.js                      |
| Front-end móvil           | React Native                 |
| Caché                     | Redis                        |
| Orquestación local        | Docker Compose               |
| Orquestación en nube      | Kubernetes (GKE)             |

---

## Despliegue

### Local (Docker Compose)

```bash
git clone https://github.com/recipy-swarch/recipy.git
cd recipy
cp .env.sample .env
sudo docker compose up --build -d
```

### GKE (Google Kubernetes Engine)

1. `gcloud auth login && gcloud config set project <REPLACE_WITH_GCLOUD_PROJECT_ID>`
2. `gcloud container clusters create recipy-kluster --zone us-central1-a --num-nodes 2 --addons=GcpFilestoreCsiDriver`
3. `gcloud container clusters get-credentials recipy-kluster --zone us-central1-a`
4. `kubectl apply -f manifests/`

---
