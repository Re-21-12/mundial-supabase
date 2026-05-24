#!/usr/bin/env bash
# Ejecuta la migración de registro de usuarios contra la base Postgres
# Variables esperadas: DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_PASSWORD

set -euo pipefail

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_NAME:-}" ]; then
  echo "Por favor exporta DB_HOST, DB_USER, DB_NAME (y opcionalmente DB_PORT, DB_PASSWORD)"
  exit 1
fi

PSQL="psql -h $DB_HOST -U $DB_USER -d $DB_NAME"

echo "Aplicando db/script/migration-user-registration.sql en $DB_HOST/$DB_NAME..."
PGPASSWORD="${DB_PASSWORD:-}" $PSQL -f db/script/migration-user-registration.sql

echo "Hecho. Comprueba la tabla MIGRATION_LOG y prueba el alta desde la app."
echo "Ejecuta: \n DB_HOST=... DB_USER=... DB_NAME=... DB_PASSWORD=... bash scripts/apply-migration-auth.sh"
