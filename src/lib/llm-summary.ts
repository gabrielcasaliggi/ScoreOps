export interface WeeklySummaryContext {
  nombre: string;
  kpiPromedio: number;
  tareasCompletadasSemana: number;
  tareasVencidas: number;
  tareasEnProceso: number;
  tareasPendientes: number;
  objetivosProximos: string[];
  eficiencia: number;
}

export function buildRuleBasedWeeklySummary(ctx: WeeklySummaryContext): string {
  const partes: string[] = [];

  partes.push(
    `Hola ${ctx.nombre.split(" ")[0]}, este es tu resumen de la semana:`
  );

  if (ctx.tareasCompletadasSemana > 0) {
    partes.push(
      `Completaste ${ctx.tareasCompletadasSemana} tarea(s). Tenés ${ctx.tareasEnProceso} en curso y ${ctx.tareasPendientes} pendiente(s).`
    );
  } else {
    partes.push(
      `Aún no cerraste tareas esta semana. Tenés ${ctx.tareasPendientes} pendiente(s) y ${ctx.tareasEnProceso} en proceso.`
    );
  }

  if (ctx.tareasVencidas > 0) {
    partes.push(
      `Atención: ${ctx.tareasVencidas} tarea(s) superaron su fecha límite. Priorizalas en Mis tareas.`
    );
  }

  if (ctx.kpiPromedio < 60) {
    partes.push(
      `Tu cumplimiento KPI promedio es ${Math.round(ctx.kpiPromedio)}%. Actualizá el avance de tus indicadores.`
    );
  } else {
    partes.push(`Tus KPIs van al ${Math.round(ctx.kpiPromedio)}% de cumplimiento.`);
  }

  if (ctx.objetivosProximos.length > 0) {
    partes.push(
      `Objetivo(s) próximo(s) a vencer: ${ctx.objetivosProximos.join(", ")}.`
    );
  }

  if (ctx.eficiencia >= 80) {
    partes.push("Tu eficiencia temporal está en buen nivel.");
  } else if (ctx.eficiencia > 0) {
    partes.push(
      `Eficiencia temporal al ${Math.round(ctx.eficiencia)}%: intentá cerrar una tarea antes de abrir otra.`
    );
  }

  return partes.join(" ");
}

function buildOllamaPrompt(ctx: WeeklySummaryContext): string {
  return `Sos un asistente de productividad laboral en una cooperativa argentina.
Redactá un resumen semanal breve (máximo 4 oraciones), tono profesional y motivador, en español rioplatense.
No inventes datos. No menciones sueldos ni sanciones.

Datos del empleado:
- Nombre: ${ctx.nombre}
- KPI promedio: ${Math.round(ctx.kpiPromedio)}%
- Tareas completadas esta semana: ${ctx.tareasCompletadasSemana}
- Tareas vencidas: ${ctx.tareasVencidas}
- En proceso: ${ctx.tareasEnProceso}, pendientes: ${ctx.tareasPendientes}
- Eficiencia temporal: ${Math.round(ctx.eficiencia)}%
- Objetivos próximos a vencer: ${ctx.objetivosProximos.length > 0 ? ctx.objetivosProximos.join(", ") : "ninguno"}

Resumen:`;
}

export async function generateOllamaWeeklySummary(
  ctx: WeeklySummaryContext
): Promise<string | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) return null;

  const model = process.env.OLLAMA_MODEL ?? "llama3.2";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildOllamaPrompt(ctx),
        stream: false,
        options: { temperature: 0.4, num_predict: 220 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { response?: string };
    const text = data.response?.trim();
    return text && text.length > 20 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWeeklySummary(
  ctx: WeeklySummaryContext
): Promise<{ texto: string; origen: "ollama" | "reglas" }> {
  const ollama = await generateOllamaWeeklySummary(ctx);
  if (ollama) return { texto: ollama, origen: "ollama" };
  return { texto: buildRuleBasedWeeklySummary(ctx), origen: "reglas" };
}
