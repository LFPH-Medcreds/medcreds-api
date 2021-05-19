#!/bin/sh

# Start the proxy
./cloud_sql_proxy -instances=$INSTANCE_CONNECTION_NAME=tcp:5432 &

# wait for the proxy to spin up
dockerize -wait tcp://$PG_WRITE_URL:5432 -timeout 60s -wait tcp://$REDIS_HOST:6379  -timeout 60s npm start
