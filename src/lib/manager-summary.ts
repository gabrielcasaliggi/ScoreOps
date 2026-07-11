import type { EmployeeProductivityExtended } from "./employee-stats";

export interface ManagerWeeklyContext {
  nombreGerente: string;
  totalEmpleados: number;
  kpiPromedioEquipo: number;
  premioPromedio: number;
  tareasCompletadasSemana: number;
  empleadosEnRiesgo: string[];
  topPerformers: string[];
  alertasAltas: number;
}

export function buildRuleBasedManagerSummary(ctx: ManagerWeeklyContext): string {
  const partes: string[] = [];

  partes.push(
    `${ctx.nombreGerente.split(" ")[0]}, resumen gerencial de la semana para tu equipo (${ctx.totalEmpleados} personas):`
  );

  partes.push(
    `KPI promedio del equipo: ${Math.round(ctx.kpiPromedioEquipo)}%. Premio semestral promedio: ${Math.round(ctx.premioPromedio)}%.`
  );

  if (ctx.tareasCompletadasSemana > 0) {
    partes.push(`Se completaron ${ctx.tareasCompletadasSemana} tarea(s) esta semana en el equipo.`);
  } else {
    partes.push("Pocas tareas cerradas esta semana — revisá bloqueos en el tablero.");
  }

  if (ctx.empleadosEnRiesgo.length > 0) {
    partes.push(
      `Atención: ${ctx.empleadosEnRiesgo.slice(0, 3).join(", ")}${ctx.empleadosEnRiesgo.length > 3 ? " y otros" : ""} con premio < 50% o KPI crítico.`
    );
  }

  if (ctx.topPerformers.length > 0) {
    partes.push(`Destacados: ${ctx.topPerformers.slice(0, 2).join(", ")}.`);
  }

  if (ctx.alertasAltas > 0) {
    partes.push(`${ctx.alertasAltas} alerta(s) de alta prioridad pendientes en el panel de análisis.`);
  }

  return partes.join(" ");
}

function buildOllamaManagerPrompt(ctx: ManagerWeeklyContext): string {
  return `Sos un asistente gerencial para una cooperativa argentina.
Redactá un resumen semanal breve (máximo 5 oraciones), tono profesional, en español rioplatense.
No inventes datos. No menciones sueldos individuales.

Datos del equipo:
- Gerente: ${ctx.nombreGerente}
- Empleados: ${ctx.totalEmpleados}
- KPI promedio equipo: ${Math.round(ctx.kpiPromedioEquipo)}%
- Premio promedio: ${Math.round(ctx.premioPromedio)}%
- Tareas completadas esta semana: ${ctx.tareasCompletadasSemana}
- Empleados en riesgo: ${ctx.empleadosEnRiesgo.length > 0 ? ctx.empleadosEnRiesgo.join(", ") : "ninguno"}
- Top performers: ${ctx.topPerformers.length > 0 ? ctx.topPerformers.join(", ") : "ninguno"}
- Alertas alta prioridad: ${ctx.alertasAltas}

Resumen gerencial:`;
}

export async function generateManagerWeeklySummary(
  ctx: ManagerWeeklyContext
): Promise<{ texto: string; origen: "ollama" | "reglas" }> {
  const fallback = buildRuleBasedManagerSummary(ctx);
  const baseUrl = process.env.OLLAMA_BASE_URL;

  if (!baseUrl) {
    return { texto: fallback, origen: "reglas" };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL ?? "llama3.2",
        prompt: buildOllamaManagerPrompt(ctx),
        stream: false,
        options: { temperature: 0.4, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { texto: fallback, origen: "reglas" };

    const data = (await res.json()) as { response?: string };
    const text = data.response?.trim();
    if (!text || text.length < 20) return { texto: fallback, origen: "reglas" };

    return { texto: text, origen: "ollama" };
  } catch {
    return { texto: fallback, origen: "reglas" };
  }
}

export function buildManagerContextFromStats(
  stats: EmployeeProductivityExtended[],
  gerente: { nombre: string; apellido: string },
  tareasCompletadasSemana: number,
  alertasAltas: number
): ManagerWeeklyContext {
  const kpiPromedioEquipo =
    stats.length > 0
      ? stats.reduce((s, e) => s + e.kpiPromedio, 0) / stats.length
      : 0;
  const premioPromedio =
    stats.length > 0
      ? stats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) / stats.length
      : 0;

  const empleadosEnRiesgo = stats
    .filter((e) => e.productivityBonus.puntajePremio < 50 || e.kpiPromedio < 50)
    .map((e) => `${e.nombre} ${e.apellido.charAt(0)}.`);

  const topPerformers = [...stats]
    .filter((e) => e.productivityBonus.puntajePremio >= 80)
    .sort((a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio)
    .map((e) => `${e.nombre} ${e.apellido.charAt(0)}.`);

  return {
    nombreGerente: `${gerente.nombre} ${gerente.apellido}`,
    totalEmpleados: stats.length,
    kpiPromedioEquipo,
    premioPromedio,
    tareasCompletadasSemana,
    empleadosEnRiesgo,
    topPerformers,
    alertasAltas,
  };
}
