# Vertia ScoreOps

Sistema web on-premise para gestión de puntajes, tareas, presentismo, KPIs y premio semestral (Art. 49) de la cooperativa.

**Documentación para usuarios:** ver [MANUAL_DE_USO.md](./MANUAL_DE_USO.md) · [Guía rápida por rol](./docs/GUIA_RAPIDA_POR_ROL.md) (demos)

## Stack

- **Next.js 16** (App Router + TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS** + componentes estilo Shadcn/ui
- **Recharts** para gráficos de productividad

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (instalado localmente en la VM)
- Nginx (recomendado como proxy inverso)
- PM2 (recomendado para mantener el proceso en ejecución)

## Instalación (desarrollo)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL y SESSION_SECRET

# 3. Crear base de datos PostgreSQL (opción automatizada)
bash scripts/setup-postgres.sh

# O manualmente:
sudo -u postgres createdb gestion_tareas

# 4. Ejecutar migraciones
npx prisma migrate dev

# 5. Datos de demo (solo desarrollo)
npm run db:seed

# 6. Iniciar en desarrollo
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | Sí |
| `SESSION_SECRET` | Secreto para firmar cookies de sesión (mín. 32 caracteres aleatorios) | Sí |
| `NODE_ENV` | `development` o `production` | Sí |
| `APP_URL` | URL pública de la app (ej. `http://181.41.240.16`). Define si la cookie de sesión usa `Secure` | Sí en producción |
| `SESSION_COOKIE_SECURE` | Forzar `Secure` en la cookie (opcional; si no se define, se infiere de `APP_URL`) | No |
| `INTEGRATION_API_KEY` | Clave para sincronización RRHH externa | No |

Generar un secreto seguro:

```bash
openssl rand -base64 32
```

## Usuarios de demo (solo desarrollo)

| Email | Rol | Contraseña |
|-------|-----|------------|
| admin@vertia.local | ADMINISTRADOR | password123 |
| gerente@vertia.local | GERENTE | password123 |
| empleado@vertia.local | EMPLEADO | password123 |

> En producción **no** se muestran credenciales en la pantalla de login y **no** se debe usar el seed con contraseñas débiles.

## Módulos del sistema

| Módulo | Ruta | Roles |
|--------|------|-------|
| Inicio operativo / tablero personal | `/dashboard` | Todos (gerente/admin ven resumen operativo) |
| Tareas / Kanban | `/dashboard/tareas` | Todos |
| Objetivos y KPIs | `/dashboard/objetivos` | Gerente, Admin |
| Equipos / Mi equipo | `/dashboard/equipo` | Gerente, Admin |
| Premio Art. 49 | `/dashboard/premio` | Gerente, Admin |
| Asistencia | `/dashboard/asistencia` | Gerente, Admin |
| Evaluaciones 360° | `/dashboard/evaluaciones` | Todos |
| Empleados | `/dashboard/empleados` | Admin |
| Auditoría de puntajes | `/dashboard/auditoria` | Admin |
| Configuración | `/dashboard/configuracion` | Todos |

## Algoritmos de productividad

- **Cumplimiento KPI:** `(Valor Actual / Valor Meta) × 100`
- **Eficiencia temporal:** `(Tiempo Estimado / Tiempo Real) × 100` en tareas completadas
- **Premio Art. 49:** tramos individuales (base, asistencia) y colectivos (reparaciones, pulsos, cobranzas). Ver detalle en el manual de uso.

## Despliegue en producción (VM on-premise)

### Checklist previo al deploy

- [ ] `SESSION_SECRET` único y seguro en `.env`
- [ ] `APP_URL` con la URL real de acceso (ej. `http://IP` sin HTTPS o `https://dominio` con TLS)
- [ ] `NODE_ENV=production` en `.env` y en PM2
- [ ] Contraseña de PostgreSQL distinta a la de desarrollo
- [ ] **No ejecutar** `npm run db:seed` (o usar solo datos reales)
- [ ] HTTPS configurado en Nginx (certificado interno o Let's Encrypt)
- [ ] PostgreSQL escuchando solo en red local (`listen_addresses`)
- [ ] Backup automático de la base de datos configurado
- [ ] Usuarios reales creados con contraseñas seguras (mín. 6 caracteres)
- [ ] Firewall: solo puertos 80/443 expuestos a la red interna

### 1. Preparar la base de datos

```bash
# En la VM de producción — solo migraciones, sin seed
npx prisma migrate deploy
```

### 2. Build

```bash
npm ci
npm run build
```

### 3. PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Verificar que el proceso responde:

```bash
curl -I http://127.0.0.1:3000
```

### 4. Nginx (proxy inverso con HTTPS)

Ejemplo con redirección HTTP → HTTPS y certificado (ajustar rutas del certificado):

```nginx
server {
    listen 80;
    server_name vertia.cooperativa.local;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vertia.cooperativa.local;

    ssl_certificate     /etc/ssl/certs/vertia.crt;
    ssl_certificate_key /etc/ssl/private/vertia.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. PostgreSQL

- Restringir acceso a la red local en `postgresql.conf` y `pg_hba.conf`
- Usar credenciales dedicadas en `.env` (no el usuario `postgres`)
- Programar backups periódicos, por ejemplo con `pg_dump` en cron:

```bash
# Ejemplo diario a las 02:00
0 2 * * * pg_dump -U vertia gestion_tareas | gzip > /var/backups/vertia_$(date +\%Y\%m\%d).sql.gz
```

### 6. Actualizaciones

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart vertia-gestion
```

## Seguridad

- Sesiones de 8 horas con cookie `httpOnly` y `secure` en producción
- Bloqueo temporal tras 5 intentos fallidos de login (15 minutos)
- Contraseña obligatoria al crear empleados (no hay contraseña por defecto en producción)
- Recuperación de contraseña: solicitud al administrador desde el login

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run db:migrate` | Migración en desarrollo |
| `npm run db:seed` | Seed de demo (solo dev) |
| `npm run test` | Tests del motor de premio (Art. 49 y KPI) |
| `npm run db:studio` | Prisma Studio (explorar BD) |
| `bash scripts/setup-postgres.sh` | Configurar PostgreSQL local |

## Estructura del proyecto

```
src/
├── app/
│   ├── api/          # Endpoints REST
│   ├── dashboard/    # Vistas del dashboard
│   └── page.tsx      # Login
├── components/
│   ├── ui/           # Componentes base
│   ├── dashboard/    # Gráficos y tableros
│   └── layout/       # Shell de la app
└── lib/
    ├── prisma.ts     # Cliente Prisma
    ├── auth.ts       # Sesiones
    ├── premio-art49.ts
    └── productivity.ts
prisma/
├── schema.prisma     # Modelo de datos
└── seed.ts           # Datos de demo
MANUAL_DE_USO.md      # Manual para usuarios finales
```

## Soporte

Para consultas de uso del sistema, ver [MANUAL_DE_USO.md](./MANUAL_DE_USO.md).  
Para incidencias técnicas, contactar al administrador de sistemas de la cooperativa.
