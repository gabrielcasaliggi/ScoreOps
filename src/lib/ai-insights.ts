import type { EmployeeProductivity } from "./productivity";

export interface AiInsight {
  id: string;
  tipo: "alerta" | "sugerencia" | "positivo";
  titulo: string;
  descripcion: string;
  prioridad: "alta" | "media" | "baja";
  empleadoId?: string;
  accion?: string;
}

export function generateTeamInsights(
  empleados: EmployeeProductivity[]
): AiInsight[] {
  const insights: AiInsight[] = [];

  if (empleados.length === 0) {
    return [
      {
        id: "empty",
        tipo: "sugerencia",
        titulo: "Sin datos de equipo",
        descripcion: "Aún no hay empleados con objetivos o tareas registradas.",
        prioridad: "baja",
      },
    ];
  }

  const bajoRendimiento = empleados.filter(
    (e) => e.productivityBonus.puntajePremio < 50
  );
  for (const emp of bajoRendimiento) {
    insights.push({
      id: `low-score-${emp.userId}`,
      tipo: "alerta",
      titulo: `Rendimiento bajo: ${emp.nombre} ${emp.apellido}`,
      descripcion: `Puntaje premio de ${emp.productivityBonus.puntajePremio}. KPI al ${Math.round(emp.kpiPromedio)}% y eficiencia evaluable al ${Math.round(emp.productivityBonus.eficienciaEvaluable)}%.`,
      prioridad: "alta",
      empleadoId: emp.userId,
      accion: "Revisar objetivos y redistribuir tareas prioritarias",
    });
  }

  const desvioAlto = empleados.filter(
    (e) => e.temporalEfficiency.desvioPorcentaje > 25
  );
  for (const emp of desvioAlto) {
    insights.push({
      id: `desvio-${emp.userId}`,
      tipo: "sugerencia",
      titulo: `Desvío temporal en ${emp.nombre}`,
      descripcion: `Las tareas completadas tardan un ${Math.round(emp.temporalEfficiency.desvioPorcentaje)}% más de lo estimado. Considerar ajustar estimaciones o identificar bloqueos.`,
      prioridad: "media",
      empleadoId: emp.userId,
      accion: "Revisar estimaciones de tiempo en tareas recurrentes",
    });
  }

  const kpiRiesgo = empleados.flatMap((e) =>
    e.kpiCompliance
      .filter((k) => k.cumplimiento < 50)
      .map((k) => ({
        empleado: e,
        kpi: k,
      }))
  );

  for (const { empleado, kpi } of kpiRiesgo.slice(0, 5)) {
    insights.push({
      id: `kpi-risk-${kpi.kpiId}`,
      tipo: "alerta",
      titulo: `KPI crítico: ${kpi.nombre}`,
      descripcion: `${empleado.nombre} ${empleado.apellido} está al ${Math.round(kpi.cumplimiento)}% en "${kpi.nombre}" (${kpi.valorActual}/${kpi.valorMeta} ${kpi.unidad}).`,
      prioridad: "alta",
      empleadoId: empleado.userId,
      accion: "Asignar tareas vinculadas a este KPI",
    });
  }

  const topPerformers = [...empleados]
    .filter((e) => e.productivityBonus.puntajePremio >= 80)
    .sort((a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio);

  for (const emp of topPerformers.slice(0, 2)) {
    insights.push({
      id: `top-${emp.userId}`,
      tipo: "positivo",
      titulo: `Alto rendimiento: ${emp.nombre} ${emp.apellido}`,
      descripcion: `Puntaje premio de ${emp.productivityBonus.puntajePremio}. Candidato destacado para el premio de productividad.`,
      prioridad: "baja",
      empleadoId: emp.userId,
    });
  }

  const priorizacion = suggestTaskPrioritization(empleados);
  insights.push(...priorizacion);

  if (insights.length === 0) {
    insights.push({
      id: "all-good",
      tipo: "positivo",
      titulo: "Equipo en buen estado",
      descripcion: "No se detectaron alertas críticas. El rendimiento general del equipo está dentro de parámetros normales.",
      prioridad: "baja",
    });
  }

  const priorityOrder = { alta: 0, media: 1, baja: 2 };
  return insights.sort(
    (a, b) => priorityOrder[a.prioridad] - priorityOrder[b.prioridad]
  );
}

function suggestTaskPrioritization(
  empleados: EmployeeProductivity[]
): AiInsight[] {
  const suggestions: AiInsight[] = [];

  const conPocosCompletadas = empleados.filter(
    (e) =>
      e.temporalEfficiency.tareasCompletadas < 2 &&
      e.kpiPromedio < 60
  );

  if (conPocosCompletadas.length > 0) {
    const nombres = conPocosCompletadas
      .map((e) => `${e.nombre} ${e.apellido.charAt(0)}.`)
      .join(", ");
    suggestions.push({
      id: "prioritize-tasks",
      tipo: "sugerencia",
      titulo: "Priorizar tareas de impacto en KPI",
      descripcion: `${nombres} tienen bajo avance. Se recomienda enfocar en tareas vinculadas a objetivos con KPIs en riesgo antes que tareas de prioridad baja.`,
      prioridad: "media",
      accion: "Reordenar tablero: mover tareas de prioridad 1 al estado 'En proceso'",
    });
  }

  return suggestions;
}

export function generatePersonalInsights(data: {
  kpiPromedio: number;
  temporalEfficiency: { eficiencia: number; desvioPorcentaje: number; tareasCompletadas: number };
  tareasPorEstado: { pendiente: number; enProceso: number; completada: number };
  kpiCompliance: { nombre: string; cumplimiento: number }[];
}): AiInsight[] {
  const insights: AiInsight[] = [];

  if (data.kpiPromedio < 50) {
    insights.push({
      id: "personal-kpi",
      tipo: "alerta",
      titulo: "KPIs por debajo del objetivo",
      descripcion: `Tu cumplimiento promedio es ${Math.round(data.kpiPromedio)}%. Enfócate en los indicadores con menor avance.`,
      prioridad: "alta",
      accion: "Actualiza el progreso de tus KPIs y completa tareas vinculadas",
    });
  }

  if (data.tareasPorEstado.enProceso > 3) {
    insights.push({
      id: "wip-limit",
      tipo: "sugerencia",
      titulo: "Demasiadas tareas en paralelo",
      descripcion: `Tienes ${data.tareasPorEstado.enProceso} tareas en proceso. Completar una antes de iniciar otra mejora la eficiencia temporal.`,
      prioridad: "media",
      accion: "Completa tareas en curso antes de iniciar nuevas",
    });
  }

  if (data.temporalEfficiency.desvioPorcentaje > 30) {
    insights.push({
      id: "time-estimate",
      tipo: "sugerencia",
      titulo: "Ajustar estimaciones de tiempo",
      descripcion: `Tus tareas tardan un ${Math.round(data.temporalEfficiency.desvioPorcentaje)}% más de lo estimado. Considera revisar tus planificaciones.`,
      prioridad: "media",
    });
  }

  const peorKpi = [...data.kpiCompliance].sort(
    (a, b) => a.cumplimiento - b.cumplimiento
  )[0];

  if (peorKpi && peorKpi.cumplimiento < 70) {
    insights.push({
      id: "focus-kpi",
      tipo: "sugerencia",
      titulo: `Enfócate en: ${peorKpi.nombre}`,
      descripcion: `Es tu KPI con menor cumplimiento (${Math.round(peorKpi.cumplimiento)}%). Prioriza tareas relacionadas con este indicador.`,
      prioridad: "media",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "personal-ok",
      tipo: "positivo",
      titulo: "Buen ritmo de trabajo",
      descripcion: "Tu rendimiento está en línea con los objetivos. Mantén el enfoque en las tareas prioritarias.",
      prioridad: "baja",
    });
  }

  return insights;
}
