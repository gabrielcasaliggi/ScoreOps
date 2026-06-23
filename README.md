# Vertia ScoreOps

Sistema web on-premise para gestión de puntajes, tareas, presentismo y KPIs de la cooperativa.

## Stack

- **Next.js 16** (App Router + TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS** + componentes estilo Shadcn/ui
- **Recharts** para gráficos de productividad

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (instalado localmente en la VM)

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar DATABASE_URL y SESSION_SECRET

# 3. Crear base de datos PostgreSQL
sudo -u postgres createdb gestion_tareas

# 4. Ejecutar migraciones y seed
npx prisma migrate dev --name init
npm run db:seed

# 5. Iniciar en desarrollo
npm run dev
```

## Usuarios de demo

| Email | Rol | Contraseña |
|-------|-----|------------|
| admin@vertia.local | ADMINISTRADOR | password123 |
| gerente@vertia.local | GERENTE | password123 |
| empleado@vertia.local | EMPLEADO | password123 |

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |
| GET/POST | `/api/tareas` | Listar/crear tareas |
| PATCH | `/api/tareas/[id]` | Actualizar tarea |
| GET/POST | `/api/objetivos` | Objetivos |
| GET/POST/PATCH | `/api/kpis` | KPIs |
| GET | `/api/stats/equipo` | Estadísticas del equipo (gerente) |
| GET | `/api/stats/personal` | Estadísticas personales |

## Algoritmos de productividad

- **Cumplimiento KPI:** `(Valor Actual / Valor Meta) × 100`
- **Eficiencia temporal:** `(Tiempo Estimado / Tiempo Real) × 100` en tareas completadas
- **Score general:** `60% KPI + 40% Eficiencia`

## Despliegue en producción (VM on-premise)

### 1. Build

```bash
npm run build
```

### 2. PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx (proxy inverso)

```nginx
server {
    listen 80;
    server_name vertia.cooperativa.local;

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

### 4. PostgreSQL

Asegurar que PostgreSQL escucha solo en la red local y que las credenciales en `.env` son seguras.

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
    └── productivity.ts # Cálculos KPI/eficiencia
prisma/
├── schema.prisma     # Modelo de datos
└── seed.ts           # Datos de demo
```
