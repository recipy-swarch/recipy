FROM node:18-alpine

WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN npm ci
COPY .env.development .env.production

EXPOSE 3000
ENV PORT=3000

COPY --exclude=/app . .
VOLUME  /app/app

CMD ["npm", "run", "dev"]
