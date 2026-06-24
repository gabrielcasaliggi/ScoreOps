# Manual de uso — Vertia ScoreOps

Sistema de gestión de puntajes, tareas, presentismo, KPIs y premio semestral para la cooperativa.

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Navegación general](#3-navegación-general)
4. [Empleado](#4-empleado)
5. [Gerente de área](#5-gerente-de-área)
6. [Administrador](#6-administrador)
7. [Premio semestral (Art. 49)](#7-premio-semestral-art-49)
8. [Notificaciones](#8-notificaciones)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)

---

## 1. Acceso al sistema

### Ingresar

1. Abrí el navegador y accedé a la URL que te indicó el administrador (por ejemplo `https://vertia.cooperativa.local`).
2. Ingresá tu **email** y **contraseña**.
3. Hacé clic en **Iniciar sesión**.

### Olvidé mi contraseña

1. En la pantalla de login, hacé clic en **¿Olvidaste tu contraseña?**
2. Ingresá tu email y enviá la solicitud.
3. Un administrador recibirá la notificación y restablecerá tu acceso.
4. Si ya tenés un **token de restablecimiento**, usá el enlace **Tengo un token de restablecimiento** en el login.

### Cambiar mi contraseña

1. Hacé clic en el ícono de **engranaje** (Configuración) en la barra superior.
2. Completá contraseña actual, nueva contraseña y confirmación.
3. La contraseña debe tener al menos **6 caracteres**.

### Cerrar sesión

Hacé clic en el ícono de **salir** (flecha) en la esquina superior derecha.

---

## 2. Roles y permisos

| Función | Empleado | Gerente | Administrador |
|---------|:--------:|:-------:|:-------------:|
| Ver mi tablero y puntaje | ✓ | ✓ | ✓ |
| Gestionar mis tareas | ✓ | ✓ | ✓ |
| Completar evaluaciones 360° | ✓ | ✓ | ✓ |
| Ver estadísticas del equipo | — | ✓ (su área) | ✓ (toda la coop.) |
| Kanban y asignación de tareas | — | ✓ | ✓ |
| Objetivos y KPIs | — | ✓ | ✓ |
| Asistencia e importación | — | ✓ | ✓ |
| Gestión de empleados | — | — | ✓ |
| Auditoría y recálculo de puntajes | — | — | ✓ |
| Configuración Art. 49 | — | — | ✓ |
| Restablecer contraseñas de otros | — | ✓ | ✓ |

---

## 3. Navegación general

### Barra superior (escritorio)

- **Resumen / Mi tablero:** pantalla principal según tu rol.
- **Coordinación / Mi área:** estadísticas del equipo (gerentes y administradores).
- **Kanban / Mis tareas:** gestión de tareas.
- **Más:** menú desplegable con secciones adicionales (Objetivos, Asistencia, Evaluaciones, etc.).
- **Campana:** notificaciones.
- **Engranaje:** configuración de cuenta.
- **Avatar:** tu nombre, rol y área.

### Barra inferior (celular)

En pantallas chicas, los accesos principales aparecen como íconos en la parte inferior.

---

## 4. Empleado

### Mi tablero (inicio)

Al ingresar verás:

- **Premio Art. 49:** porcentaje estimado del sueldo de referencia para el semestre actual.
- **Cumplimiento KPI:** promedio de tus indicadores.
- **Eficiencia evaluable:** relación entre tiempo estimado y tiempo real en tareas que cuentan para el premio.
- **Desglose del premio:** detalle de cada tramo (base, asistencia, metas colectivas).
- **Mis KPIs:** barras de progreso por indicador.
- **Análisis inteligente:** alertas y sugerencias automáticas.
- **Mi tablero de tareas:** columnas Pendiente → En proceso → Completada.

### Gestionar mis tareas

#### Desde el tablero principal

1. En la columna **Pendiente**, hacé clic en **Iniciar** para comenzar una tarea.
2. El sistema registra el tiempo automáticamente (cronómetro en vivo).
3. Cuando termines, hacé clic en **Completar**.
4. El tiempo real queda guardado y afecta tu eficiencia si la tarea está marcada para el premio.

#### Desde Mis tareas

1. Andá a **Mis tareas** en el menú.
2. Filtrá por estado: Todas, Pendiente, En proceso o Completada.
3. Revisá tiempo estimado vs. tiempo real en cada tarjeta.

> **Importante:** solo las tareas marcadas con la etiqueta **Premio ×N** impactan en el cálculo del premio semestral.

### Evaluaciones 360°

1. Andá a **Más → Evaluaciones**.
2. En **Pendientes** verás las evaluaciones que debés completar (autoevaluación, evaluación de pares, etc.).
3. Hacé clic en **Evaluar**, asigná puntajes por competencia (1 a 5) y opcionalmente dejá un comentario.
4. Guardá la evaluación.

---

## 5. Gerente de área

Además de todo lo del empleado, el gerente puede supervisar su equipo.

### Panel de gestión (Resumen)

Muestra el puntaje promedio del equipo, cantidad de empleados, KPI promedio y accesos rápidos a Coordinación y Kanban.

### Coordinación / Mi área

- Estadísticas del equipo con selector de **período** (actual / anterior).
- Gráficos de productividad por empleado.
- **Metas colectivas** del semestre (reparaciones, pulsos, cobranzas).
- **Exportar** informe en PDF o Excel (botones en la sección de equipo).

### Kanban de tareas

1. Andá a **Kanban**.
2. Vista por columnas: Pendiente, En proceso, Completada.
3. **Arrastrá** tarjetas entre columnas para cambiar el estado.
4. Filtrá por empleado con el selector superior.
5. **Crear tarea:** botón **+** → completá título, empleado, tiempo estimado, prioridad, objetivo vinculado (opcional) y si evalúa productividad.

| Campo | Descripción |
|-------|-------------|
| Tiempo estimado | Minutos previstos para la tarea |
| Evalúa productividad | Si cuenta para el premio semestral |
| Peso productividad | Multiplicador (ej. ×2) |
| Objetivo | Vincula la tarea a un objetivo del empleado |

### Objetivos y KPIs

1. Andá a **Más → Objetivos**.
2. **Crear objetivo:** título, empleado, fechas de inicio y fin.
3. Dentro de cada objetivo, agregá **KPIs** con nombre, meta, valor actual y unidad.
4. El cumplimiento se calcula automáticamente: `(valor actual / meta) × 100`.

### Asistencia

1. Andá a **Más → Asistencia**.
2. **Registro manual:** empleado, fecha, tipo (presente, impuntualidad, inasistencia, licencias, etc.).
3. **Importar CSV:** dos formatos disponibles:
   - **Reloj:** export del reloj de fichadas (legajo, fecha, entrada, salida).
   - **Completo:** columnas `legajo, fecha, tipo, minutos_tarde, observacion`.
4. Descargá la plantilla de ejemplo antes de importar.
5. Revisá el resumen de filas importadas y errores por fila.

La asistencia impacta el tramo **b) Asistencia perfecta** del premio Art. 49.

### Evaluaciones 360° (como gerente)

- Podés **crear ciclos** de evaluación con fechas de inicio y fin.
- Ver **resultados** agregados por empleado al cerrar un ciclo.
- Completar evaluaciones pendientes donde seas evaluador.

### Configuración (gerente)

- Cambiar tu propia contraseña.
- **Restablecer contraseña** de empleados de tu área.

---

## 6. Administrador

El administrador tiene acceso completo al sistema.

### Gestión de empleados

1. Andá a **Más → Empleados**.
2. **Alta manual:** email, nombre, apellido, legajo, área, rol y **contraseña** (obligatoria, mín. 6 caracteres).
3. **Editar:** modificá datos, sueldo básico, valor de antigüedad, área o rol.
4. **Desactivar / reactivar** empleados.
5. **Importar CSV:** columnas `legajo, email, nombre, apellido, area, role, password`.
   - Usuarios nuevos **requieren contraseña** en el CSV.
   - Usuarios existentes se actualizan; la contraseña es opcional al actualizar.

> Los campos **sueldo básico** y **valor antigüedad** son necesarios para calcular el monto en pesos del premio Art. 49.

### Auditoría de puntajes

1. Andá a **Más → Auditoría**.
2. Revisá el historial de cálculos por empleado: puntaje base, inasistencias, multiplicador y puntaje final.
3. Filtrá por período semestral.
4. **Recalcular:** fuerza un nuevo cálculo para todos los empleados del período (queda registrado en el log).

### Configuración Art. 49

En **Configuración**, el administrador puede ajustar:

| Parámetro | Descripción |
|-----------|-------------|
| Antigüedad mínima | Meses requeridos para el tramo base (30%) |
| Tramos A–E | Porcentajes de cada tramo del premio |
| Impuntualidad máx. | Cantidad y minutos tolerados |
| Metas colectivas | Reparaciones, pulsos, cobranzas |

También podés editar los **valores actuales de metas colectivas** del semestre en curso desde el panel de Coordinación o Configuración.

### Integración RRHH (futuro)

En Configuración hay un endpoint preparado para sincronización con sistemas externos de RRHH. Requiere la clave `INTEGRATION_API_KEY` configurada en el servidor.

---

## 7. Premio semestral (Art. 49)

El premio se calcula por **semestre**:

| Semestre | Meses de cálculo | Liquidación |
|----------|------------------|-------------|
| S1 | Enero – Junio | Septiembre |
| S2 | Julio – Diciembre | Marzo |

### Tramos del premio (hasta 50% del sueldo básico + antigüedad)

| Tramo | % | Tipo | Condición |
|-------|---|------|-----------|
| **a) Base** | 30% | Individual | Antigüedad mínima de 6 meses |
| **b) Asistencia perfecta** | 5% | Individual | Máx. 5 impuntualidades de hasta 5 min; sin faltas injustificadas ni sanciones |
| **c) Reparaciones** | 5% | Colectivo | 95% de reclamos resueltos el mismo día |
| **d) Pulsos** | 5% | Colectivo | 100% o más vs. semestre anterior |
| **e) Cobranzas** | 5% | Colectivo | ≥ 80% de cobranza sobre facturación |

### Qué ves en pantalla

- **Empleado:** porcentaje total, monto estimado en pesos y desglose tramo por tramo (activo / inactivo y motivo).
- **Gerente / Admin:** promedio del equipo y metas colectivas del semestre.

### Indicadores complementarios (no son el premio directo)

- **KPIs:** miden cumplimiento de objetivos asignados.
- **Eficiencia temporal:** compara tiempo estimado vs. real en tareas completadas.
- Estos indicadores alimentan el **análisis inteligente** y la gestión interna, pero el premio en pesos se rige por Art. 49.

---

## 8. Notificaciones

El ícono de **campana** en la barra superior muestra alertas automáticas:

| Tipo | Cuándo aparece |
|------|----------------|
| KPI en riesgo | Cumplimiento por debajo del 50% |
| Tarea vencida | Tarea no completada pasada la fecha límite |
| Objetivo próximo | Objetivo vence en los próximos 7 días |
| Sistema | Avisos generales (ej. solicitud de restablecimiento de contraseña) |

- Hacé clic en la campana para ver el listado.
- Marcá una notificación como leída con el tilde, o **Marcar todas** para limpiar el contador.

---

## 9. Preguntas frecuentes

### ¿Por qué mi premio muestra 0% o "No elegible"?

Revisá el desglose: puede faltar antigüedad mínima, tener inasistencias injustificadas, sanciones, o no haberse cumplido metas colectivas del equipo.

### ¿Por qué una tarea no afecta mi eficiencia?

Solo las tareas marcadas como **evalúa productividad** (etiqueta "Premio ×N") cuentan para la eficiencia evaluable del premio.

### ¿Puedo editar una tarea ya completada?

Contactá a tu gerente. Los gerentes pueden modificar tareas desde el Kanban.

### ¿Cada cuánto se actualizan las estadísticas?

El panel de Coordinación se refresca automáticamente cada ~45 segundos. El tablero personal se actualiza al completar acciones o al recargar la página.

### ¿La sesión expira?

Sí, después de **8 horas** de inactividad. Volvé a ingresar con tu email y contraseña.

### ¿Qué hago si veo "Algo salió mal"?

Hacé clic en **Reintentar**. Si persiste, cerrá sesión, volvé a ingresar o contactá al administrador.

### ¿Cómo exporto un informe del equipo?

En **Coordinación**, usá los botones de exportación **PDF** o **Excel** disponibles en la sección de estadísticas del equipo.

---

## Glosario

| Término | Significado |
|---------|-------------|
| **KPI** | Indicador clave de rendimiento vinculado a un objetivo |
| **Objetivo** | Meta asignada a un empleado con período y KPIs asociados |
| **Eficiencia** | Tiempo estimado ÷ tiempo real (en tareas completadas) |
| **Art. 49** | Normativa del premio semestral a la productividad |
| **Meta colectiva** | Objetivo de todo el equipo (reparaciones, pulsos, cobranzas) |
| **Ciclo 360°** | Período de evaluación por competencias entre pares, gerentes y autoevaluación |
| **Legajo** | Número identificador del empleado en la cooperativa |

---

*Vertia ScoreOps — Cooperativa. Para soporte técnico, contactá al administrador del sistema.*
