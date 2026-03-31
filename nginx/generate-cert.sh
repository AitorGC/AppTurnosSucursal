#!/bin/bash
# Genera un certificado autofirmado con Subject Alternative Name (SAN)
# para que Chrome lo acepte en red local.
#
# Uso: ./generate-cert.sh [IP_DEL_SERVIDOR]
# Ejemplo: ./generate-cert.sh 172.16.12.66

SERVER_IP="${1:-172.16.12.66}"
CERT_DIR="$(dirname "$0")/certs"
DAYS=3650  # 10 años

mkdir -p "$CERT_DIR"

echo "→ Generando certificado para IP: $SERVER_IP"
echo "→ Validez: $DAYS días (~10 años)"

# Crear fichero de extensiones con el SAN (requerido por Chrome moderno)
cat > /tmp/openssl-san.cnf <<EOF
[req]
default_bits       = 2048
prompt             = no
distinguished_name = dn
req_extensions     = v3_req

[dn]
C  = ES
ST = España
L  = Local
O  = Auteide
CN = $SERVER_IP

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = $SERVER_IP
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF

openssl req -x509 -nodes -days "$DAYS" \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/server.key" \
  -out    "$CERT_DIR/server.crt" \
  -config /tmp/openssl-san.cnf \
  -extensions v3_req 2>/dev/null

echo "✅ Certificado generado en $CERT_DIR/"
echo "   server.crt  — certificado público"
echo "   server.key  — clave privada"
