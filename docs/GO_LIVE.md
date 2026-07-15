# Go-live — ScoreOps

Checklist y runbook para poner (o revalidar) producción.  
Destino típico: VM `/opt/vertia/ScoreOps`, proceso PM2 `vertia-gestion`, Postgres local.

---

## 1. Antes del go-live (una vez)

### Entorno y secretos

- [ ] `DATABASE_URL` apunta a la DB de **producción** (no la de demos mezclada sin querer)
- [ ] `SESSION_SECRET` único, ≥ 32 caracteres, distinto de local
- [ ] `APP_URL` es la URL pública real (`https://…` o IP con el esquema correcto)
- [ ] `SESSION_COOKIE_SECURE=true` si hay HTTPS (o que se infiera bien desde `APP_URL`)
- [ ] `VERTIA_SUPER_ADMIN_EMAILS` solo emails Vertia (no demos comerciales)
- [ ] `HEALTH_CHECK_TOKEN` definido si usás health detallado / UptimeRobot
- [ ] `APP_VERSION` actualizado en cada release (opcional pero útil)

Referencia de variables: [`.env.example`](../.env.example).

### Datos y acceso

- [ ] Backup automático diario de Postgres configurado
- [ ] **Restore de prueba** hecho al menos una vez (backup que no se restauró no cuenta)
- [ ] Usuarios demo con passwords conocidas: desactivados o rotados en prod
- [ ] Al menos una empresa real con slug conocido (login **exige** código de empresa)
- [ ] Superadmin puede entrar a `/dashboard/superadmin` y listar empresas

### Operación

- [ ] PM2 con restart on reboot (`pm2 save` + `pm2 startup`)
- [ ] Nginx (o proxy) apunta al puerto de Next y, si aplica, HTTPS
- [ ] Disk space y rotación de logs PM2 revisados
- [ ] Cron o UptimeRobot: `scripts/check-health.sh https://TU_URL`

---

## 2. Deploy estándar

```bash
cd /opt/vertia/ScoreOps
git fetch origin
git checkout main
git pull origin main

# Si hay migraciones Prisma versionadas:
# npx prisma migrate deploy
# Si el entorno usa push (solo sin migraciones pendientes documentadas):
# npx prisma db push

npm ci
npm run build
pm2 restart vertia-gestion

# Health
APP_URL=https://TU_HOST npm run health:check
# o:
# bash scripts/check-health.sh https://TU_HOST
```

### Rollback rápido

```bash
cd /opt/vertia/ScoreOps
git log -5 --oneline          # anotar el commit previo bueno
git checkout <commit-bueno>
npm ci && npm run build
pm2 restart vertia-gestion
bash scripts/check-health.sh https://TU_HOST
```

---

## 3. Smoke test post-deploy (15 min)

### A. Salud

- [ ] `GET /api/health` → `status: ok` (y DB ok en detailed si tenés token)

### B. Multi-tenant (crítico)

- [ ] Logout completo
- [ ] Login empresa **A** con su **slug** → Empleados → crear área con nombre único (`QA-GO-LIVE-A`)
- [ ] Logout → login empresa **B** con su slug
- [ ] En Áreas de B **no** aparece `QA-GO-LIVE-A`
- [ ] El panel de áreas muestra el nombre/código de B

### C. Flujo operativo

- [ ] Admin/gerente A: asignar tarea a empleado
- [ ] Empleado: En proceso → enviar a revisión
- [ ] Gerente: Aprobar desde `/dashboard/aprobaciones` **o** kanban (Por aprobar)
- [ ] Empleado ve tarea Completada / notificación
- [ ] Devolver (rechazar) una segunda solicitud con motivo opcional → vuelve a En proceso

### D. Config

- [ ] `/dashboard/configuracion` → Empresa → Aprobaciones: toggles visibles
- [ ] Link “Ver cola” abre aprobaciones

---

## 4. Backup / restore (mínimo viable)

### Backup manual de ejemplo

```bash
# Ajustar usuario, DB y ruta
pg_dump -Fc -U vertia -h localhost gestion_tareas > /var/backups/scoreops-$(date +%F).dump
```

### Restore de prueba (en entorno de staging o DB temporal)

```bash
pg_restore -U vertia -h localhost -d gestion_tareas_restore --clean --if-exists /var/backups/scoreops-YYYY-MM-DD.dump
```

- [ ] Documentar dónde viven los dumps y retención (ej. 14 días)

---

## 5. Monitoreo y soporte

| Señal | Cómo |
|-------|------|
| App caída | UptimeRobot → `/api/health` o `scripts/check-health.sh` |
| Proceso Node | `pm2 status` / `pm2 logs vertia-gestion --lines 100` |
| DB | Health `checks.database` + logs Postgres |
| Errores app | Logs PM2; Sentry si `SENTRY_DSN` está configurado |

**Contacto interno:** quién reinicia PM2, quién toca Postgres, quién crea empresas (superadmin).

---

## 6. Criterio de “listo”

Go-live **aprobado** solo si:

1. Deploy + health OK  
2. Smoke multi-tenant OK  
3. Smoke tarea → aprobación OK  
4. Backup + al menos un restore de prueba documentado  

Features nuevas **no** reemplazan estos cuatro puntos.

---

## 7. Tests automatizados relacionados

En CI (`npm test`) deben pasar scopes/workflows:

```bash
npm test
```

Archivos clave:

- `src/lib/workflows.test.ts` — quién puede aprobar/devolver
- `src/lib/tenant.test.ts` — filtros e igualdad de org
- `src/lib/task-utils.test.ts` — labels operativos de estado

No sustituyen el smoke manual multi-tenant del §3.
