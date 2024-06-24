#
# Don't forget to build ember for production before building this image:
#
#    ember build --env=production
#
FROM node:0.12.2

MAINTAINER Namlook <nicolas.clairon@elkorado.com>

RUN apt-get update && apt-get install -y \
        graphicsmagick \
        phylip \
        libc6-i386 \
        r-base \
        r-base-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://cran.r-project.org/src/contrib/Archive/ape/ape_3.3.tar.gz \
 && wget https://cran.r-project.org/src/contrib/RSvgDevice_0.6.4.4.tar.gz \
 && R CMD INSTALL ape_3.3.tar.gz \
 && R CMD INSTALL RSvgDevice_0.6.4.4.tar.gz

COPY ./package.json /app/package.json
COPY ./bower.json /app/bower.json
COPY ./ember-cli-build.js /app/ember-cli-build.js
COPY ./app /app/app
COPY ./dist /app/dist
COPY ./backend /app/backend
COPY ./config /app/config
COPY ./public /app/public

# add more files here if you need it
COPY ./bin /app/bin
COPY ./config/secret.json /app/config/secret.json

WORKDIR /app

ENV NODE_ENV production

RUN npm install && npm install -g bower && bower --allow-root install

EXPOSE 80

CMD ["node", "backend"]
