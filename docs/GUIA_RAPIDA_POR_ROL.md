# Guía rápida por rol — ScoreOps

Referencia de 5 minutos para demos y onboarding. Manual completo: [MANUAL_DE_USO.md](../MANUAL_DE_USO.md).

---

## Credenciales demo (Cooperativa Demo)

| Rol | Email | Contraseña | Org slug |
|-----|-------|------------|----------|
| Administrador | `admin@vertia.local` | `password123` | `demo` |
| Gerente | `gerente@vertia.local` | `password123` | `demo` |
| Empleado | `empleado@vertia.local` | `password123` | `demo` |

**Super-admin Vertia** (no usar en demos): `soporte@vertia.local` / org `vertia`

---

## Empleado — qué hacer en 3 pasos

1. **Mis tareas** — Kanban: iniciar, pausar, completar. Filtrar vencidas.
2. **Mi tablero** — Ver KPIs, actualizar valores, comparar con semestre anterior.
3. **Mi asistencia** — Revisar presentismo e impacto en premio.

**Mensaje clave:** *"Participo de mi evaluación, no solo me controlan."*

---

## Gerente — qué mostrar

1. **Inicio** — Gestión operativa: tareas vencidas, objetivos en riesgo, equipo.
2. **Tareas** — Kanban del área, asignación y prioridades.
3. **Mi equipo** — Ranking, KPI y premio por persona.
4. **Premio** — Simulador: *"¿qué pasa si el KPI sube 10%?"*

**Mensaje clave:** *"En 10 segundos veo dónde intervenir."*

---

## Administrador — configuración y directorio

1. **Ejecutivo** (menú Más) — Salud operativa, carga por persona, export PDF.
2. **Configuración** — Branding, plantilla de premio (Art. 49 / bono KPI), parámetros.
3. **Empleados** — Alta manual o import CSV.
4. **Asistencia** — Import desde reloj o planilla.
5. **Auditoría** — Trazabilidad de recálculos de puntaje.

**Onboarding:** checklist en Configuración hasta dejar la coop lista.

---

## Script demo 15 minutos

| Min | Rol | Pantalla |
|-----|-----|----------|
| 0–2 | Admin | Login con branding de la cooperativa |
| 2–5 | Gerente | Inicio operativo — vencidas y riesgo |
| 5–8 | Gerente | Tareas + objetivos/KPIs |
| 8–11 | Empleado | Tablero personal + actualizar KPI |
| 11–13 | Gerente | Premio + simulador |
| 13–15 | Admin | Export PDF ejecutivo + insights IA |

---

## Plantillas de premio

| Plantilla | Cuándo usar |
|-----------|-------------|
| **Art. 49 Cooperativo** | Convenio con tramos a–e y metas colectivas |
| **Bono por KPI** | Reglamento simple basado en cumplimiento |
| **Solo métricas** | Piloto sin cálculo monetario |

Configuración → **Motor de premio**.

---

## Soporte técnico

- Deploy: `git pull` → `npm run build` → `pm2 restart`
- Multi-tenant existente: `npm run db:migrate-phase0` → `db:push`
- Super-admin: `npm run db:setup-super-admin`
