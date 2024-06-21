FROM node:21-alpine3.19

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./ 

RUN yarn install

COPY . .


EXPOSE 3003

CMD ["yarn", "start:dev"]