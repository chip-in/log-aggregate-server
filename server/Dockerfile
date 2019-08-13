FROM node:8-alpine

ENV CI_HOME=/usr/local/chip-in
ENV SERVER_VERSION=0.0.5

RUN apk --update add pcre-dev openssl-dev curl git
RUN mkdir -p ${CI_HOME}/ \
  && cd ${CI_HOME} \
  && git clone -b ${SERVER_VERSION} https://github.com/chip-in/log-aggregate-server.git log-aggregate-server \
  && cd ${CI_HOME}/log-aggregate-server/server/ \
  && npm i \
  && npm run cleanbuild

WORKDIR ${CI_HOME}/log-aggregate-server

ENTRYPOINT ["npm", "start", "--"]
