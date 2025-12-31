#!/bin/sh
set -e

API_URL="${API_URL:-http://localhost:8000}"
EMAIL="${EMAIL:-demo@example.com}"
PASSWORD="${PASSWORD:-demo-pass-123}"
AUDIO_FILE="${1:-}"

if [ -z "$AUDIO_FILE" ]; then
  echo "Usage: $0 /path/to/audio.(wav|mp3|ogg|opus)"
  exit 1
fi

if [ ! -f "$AUDIO_FILE" ]; then
  echo "File not found: $AUDIO_FILE"
  exit 1
fi

case "$AUDIO_FILE" in
  *.opus) CONTENT_TYPE="audio/ogg" ;;
  *.ogg) CONTENT_TYPE="audio/ogg" ;;
  *.wav) CONTENT_TYPE="audio/wav" ;;
  *.mp3) CONTENT_TYPE="audio/mpeg" ;;
  *) CONTENT_TYPE="application/octet-stream" ;;
esac

login_response="$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=$EMAIL" \
  --data-urlencode "password=$PASSWORD" || true)"
token="$(echo "$login_response" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"

if [ -z "$token" ]; then
  register_response="$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
  token="$(echo "$register_response" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
fi

if [ -z "$token" ]; then
  echo "Unable to authenticate. Check API availability and credentials."
  exit 1
fi

filename="$(basename "$AUDIO_FILE")"
create_response="$(curl -s -X POST "$API_URL/submissions" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"$filename\",\"content_type\":\"$CONTENT_TYPE\",\"anonymization_mode\":\"SOFT\"}")"

submission_id="$(echo "$create_response" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')"
upload_url="$(echo "$create_response" | sed -n 's/.*"upload_url":"\([^"]*\)".*/\1/p')"

if [ -z "$submission_id" ] || [ -z "$upload_url" ]; then
  echo "Submission creation failed: $create_response"
  exit 1
fi

echo "Uploading $filename..."
curl -s -X PUT --upload-file "$AUDIO_FILE" "$upload_url" > /dev/null

curl -s -X POST "$API_URL/submissions/$submission_id/uploaded" \
  -H "Authorization: Bearer $token" > /dev/null

echo "Submitted: $submission_id"
echo "Polling for status..."

for i in $(seq 1 40); do
  status_response="$(curl -s "$API_URL/submissions/$submission_id" \
    -H "Authorization: Bearer $token")"
  status="$(echo "$status_response" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')"
  step="$(echo "$status_response" | sed -n 's/.*"processing_step":\([0-9]*\).*/\1/p')"
  echo "Status: ${status:-unknown} (step ${step:-?})"
  if [ "$status" = "APPROVED" ] || [ "$status" = "REJECTED" ] || [ "$status" = "QUARANTINED" ]; then
    break
  fi
  sleep 3
done

echo "Done. Check /library/ and / for the result."
