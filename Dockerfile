FROM node:24.22.1-alpine

# Upgrade Alpine packages, including vulnerable zlib
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]