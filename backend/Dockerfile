FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache openssl postgresql-client

RUN npm install

COPY . .

# Generar cliente de Prisma antes de iniciar
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
