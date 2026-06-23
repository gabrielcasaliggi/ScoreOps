#!/usr/bin/env bash
# Corrige permisos de PostgreSQL para Prisma Migrate (error P3014)
# Uso: bash scripts/fix-postgres-permissions.sh

set -euo pipefail

DB_USER="vertia"
DB_NAME="gestion_tareas"

echo "Otorgando permiso CREATEDB al usuario '$DB_USER'..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
ALTER USER $DB_USER CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
SQL

echo ""
echo "Listo. Ahora ejecuta:"
echo "  npm run db:migrate -- --name init"
echo ""
echo "O si prefieres sin migraciones versionadas:"
echo "  npm run db:push"
