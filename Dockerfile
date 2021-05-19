FROM node:14-alpine

WORKDIR /usr/src/app

ENV DOCKERIZE_VERSION v0.6.1
RUN wget https://github.com/jwilder/dockerize/releases/download/$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz \
    && rm dockerize-alpine-linux-amd64-$DOCKERIZE_VERSION.tar.gz

# Thre is no official support to connect to Cloud SQL in Cloud Run therefore we are using cloud sql proxy to connect to DB
# download the cloudsql proxy binary
RUN wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O ./cloud_sql_proxy
RUN chmod +x ./cloud_sql_proxy

COPY ./package*.json ./

RUN [ "npm", "install", "--only=prod" ]

WORKDIR /usr/src/app
COPY . .

RUN chmod +x docker-entrypoint.sh
CMD ["./docker-entrypoint.sh"]
