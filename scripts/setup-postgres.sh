#!/usr/bin/env bash
# Configura PostgreSQL local para el proyecto Vertia (Gestión de tareas)
# Uso: bash scripts/setup-postgres.sh

set -euo pipefail

DB_NAME="gestion_tareas"
DB_USER="vertia"
DB_PASS="vertia_local_2026"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================="
echo "  Vertia — Configuración de PostgreSQL"
echo "=========================================="
echo ""

# --- 1. Instalar PostgreSQL si no está ---
if ! command -v psql &>/dev/null; then
  echo "[1/5] Instalando PostgreSQL..."
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
else
  echo "[1/5] PostgreSQL ya instalado: $(psql --version)"
fi

# --- 2. Iniciar servicio ---
echo "[2/5] Iniciando servicio PostgreSQL..."
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager | head -5

# --- 3. Crear usuario y base de datos ---
echo "[3/5] Creando usuario '$DB_USER' y base de datos '$DB_NAME'..."

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS' CREATEDB;
  ELSE
    ALTER USER $DB_USER CREATEDB;
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL

# Permisos en el schema public (PostgreSQL 15+)
sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
SQL

# --- 4. Escribir .env del proyecto ---
echo "[4/5] Actualizando archivo .env..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"

cat > "$PROJECT_DIR/.env" <<ENV
DATABASE_URL="${DATABASE_URL}"
SESSION_SECRET="$(openssl rand -hex 32 2>/dev/null || echo "cambiar-secreto-$(date +%s)")"
NODE_ENV="development"
APP_URL="http://localhost:3000"
ENV

echo "  .env actualizado en: $PROJECT_DIR/.env"

# --- 5. Migrar y seed ---
echo "[5/5] Ejecutando migraciones y datos de demo..."
cd "$PROJECT_DIR"
npm run db:push
npm run db:seed

echo ""
echo "=========================================="
echo "  PostgreSQL listo"
echo "=========================================="
echo ""
echo "  Base de datos : $DB_NAME"
echo "  Usuario       : $DB_USER"
echo "  Contraseña    : $DB_PASS"
echo "  Host          : localhost:5432"
echo ""
echo "  Para iniciar la app:"
echo "    cd \"$PROJECT_DIR\""
echo "    npm run dev"
echo ""
echo "  Usuarios demo (app web):"
echo "    admin@vertia.local / password123"
echo "    gerente@vertia.local / password123"
echo "    empleado@vertia.local / password123"
echo ""
