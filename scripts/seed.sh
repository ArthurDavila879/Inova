#!/usr/bin/env sh
set -eu

RESET="false"
if [ "${1:-}" = "--reset" ]; then
  RESET="true"
fi

docker compose -f Docker-compose.yml exec -T inova-api \
  java -jar /app/app.jar \
  --spring.main.web-application-type=none \
  --app.seed.enabled=true \
  --app.seed.reset="$RESET"
