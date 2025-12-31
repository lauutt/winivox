#!/bin/sh
set -e

alias_name="local"
endpoint="http://minio:9000"

until mc alias set "$alias_name" "$endpoint" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  sleep 1
done

for bucket in audio-private audio-public audio-artifacts; do
  mc mb "$alias_name/$bucket" || true
done

if [ -n "${MINIO_CORS_ORIGINS:-}" ]; then
  cors_file="/tmp/cors.json"
  cat > "$cors_file" <<EOF
{"CORSRules":[{"AllowedOrigins":${MINIO_CORS_ORIGINS},"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}
EOF
  for bucket in audio-private audio-public audio-artifacts; do
    mc cors set "$alias_name/$bucket" "$cors_file" || true
  done
fi
