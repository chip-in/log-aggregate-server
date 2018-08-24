FROM node:8.9.4
ENV APP_ROOT /var/cilogger/server/

COPY package.json $APP_ROOT
COPY package-lock.json $APP_ROOT
COPY .babelrc $APP_ROOT
COPY src/*.js $APP_ROOT/src/
WORKDIR $APP_ROOT
RUN npm install && npm run cleanbuild
