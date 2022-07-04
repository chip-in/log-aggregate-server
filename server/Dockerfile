FROM node:8-alpine

ENV CI_HOME=/usr/local/chip-in

RUN apk --update add pcre-dev openssl-dev curl \
  && mkdir -p ${CI_HOME}/

COPY . ${CI_HOME}/log-aggregate-server/

RUN cd ${CI_HOME}/log-aggregate-server/server/ \
  && npm i \
  && npm run cleanbuild

WORKDIR ${CI_HOME}/log-aggregate-server

ENTRYPOINT ["npm", "start", "--"]
