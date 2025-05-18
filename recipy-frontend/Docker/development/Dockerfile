FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

RUN npx next telemetry disable

# Rergular dev server
EXPOSE 3000
# Debugging
EXPOSE 9229
EXPOSE 9230

ENV PORT=3000

COPY . .
VOLUME  /app/src

CMD ["npm", "run", "dev"]
