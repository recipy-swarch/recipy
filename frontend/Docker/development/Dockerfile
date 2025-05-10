FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

EXPOSE 3000
ENV PORT=3000

COPY . .
VOLUME  /app/app

CMD ["npm", "run", "dev"]
