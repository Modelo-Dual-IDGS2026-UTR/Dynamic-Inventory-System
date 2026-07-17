FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

COPY Controller/package*.json ./Controller/
COPY Model/package.json ./Model/

RUN npm install

COPY Controller/tsconfig.json ./Controller

COPY . .

WORKDIR /app/Controller

EXPOSE 3000

CMD ["npm", "run", "dev"]