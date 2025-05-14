FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

RUN npx next telemetry disable

EXPOSE 3000
ENV PORT=3000

COPY . .
VOLUME  /app/src

CMD ["npm", "run", "dev"]
