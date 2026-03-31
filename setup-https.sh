#!/bin/bash
# setup-https.sh — Configura HTTPS para Auteide Turnos en red local
# Ejecutar desde la raíz del proyecto: ./setup-https.sh
#
# Lo que hace:
#  1. Genera un certificado TLS autofirmado para 172.16.12.66
#  2. (Re)levanta los contenedores Docker con la nueva configuración

set -e

SERVER_IP="172.16.12.66"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔══════════════════════════════════════════════════╗"
echo "║   Auteide Turnos — Configuración HTTPS local    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Generar certificados
echo "[1/2] Generando certificado TLS para $SERVER_IP..."
bash "$SCRIPT_DIR/nginx/generate-cert.sh" "$SERVER_IP"
echo ""

# 2. Levantar / reiniciar contenedores
echo "[2/2] Levantando contenedores Docker..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Listo. Accede a la app en:                  ║"
echo "║                                                  ║"
echo "║     https://$SERVER_IP:3000                 ║"
echo "║                                                  ║"
echo "║  ⚠️  La primera vez Chrome mostrará un aviso    ║"
echo "║     de certificado. Haz clic en:                ║"
echo "║     Avanzado → Continuar con $SERVER_IP  ║"
echo "║     Esta excepción queda guardada.               ║"
echo "╚══════════════════════════════════════════════════╝"
