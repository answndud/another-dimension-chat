#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 <hostname-or-ip> [output-directory]" >&2
  exit 2
fi

HOST=$1
OUTPUT_DIR=${2:-.another-dimension-tls}
case "$HOST" in
  *[!0-9.]* ) SAN="DNS:$HOST" ;;
  * ) SAN="IP:$HOST" ;;
esac

mkdir -p "$OUTPUT_DIR"
chmod 700 "$OUTPUT_DIR"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$OUTPUT_DIR/server.key" \
  -out "$OUTPUT_DIR/server.crt" \
  -days 30 -subj "/CN=$HOST" \
  -addext "subjectAltName=$SAN" \
  >/dev/null 2>&1
chmod 600 "$OUTPUT_DIR/server.key"
chmod 644 "$OUTPUT_DIR/server.crt"

echo "Created a self-signed development certificate for $HOST."
echo "Install the certificate in the devices' trust stores before browser acceptance."
echo "./scripts/start_local_server.sh --setup --mode direct-tls --public-url https://$HOST --tls-key $OUTPUT_DIR/server.key --tls-cert $OUTPUT_DIR/server.crt"
