FROM node:24-alpine
WORKDIR /app
COPY package.json ./

COPY Controller/package.json ./Controller/
COPY Model/package.json ./Model/
COPY Db/package.json ./Db/
COPY View/frontend/package.json ./View/frontend/
RUN npm install
COPY . .

WORKDIR /app/View/frontend/
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]