import type { PremioArt49 } from "./art49-types";
import type { KpiSimpleConfig } from "./premio-templates";
import type { PremioTemplateId } from "./premio-templates";
import { TRAMOS_ART49 } from "./art49-types";

export interface PremioCitation {
  id: string;
  fuente: string;
  texto: string;
  valor?: string | number;
}

export interface PremioPasoExplicacion {
  id: string;
  titulo: string;
  explicacion: string;
  activo: boolean;
  porcentaje: number;
  citas: PremioCitation[];
}

export interface PremioExplicacion {
  plantilla: PremioTemplateId;
  porcentajeTotal: number;
  titulo: string;
  resumen: string;
  pasos: PremioPasoExplicacion[];
  citasGenerales: PremioCitation[];
  recomendaciones: string[];
}

function cita(id: string, fuente: string, texto: string, valor?: string | number): PremioCitation {
  return { id, fuente, texto, valor };
}

export function explicarPremioArt49(
  art49: PremioArt49,
  periodoLabel: string
): PremioExplicacion {
  const pasos: PremioPasoExplicacion[] = art49.tramos.map((t) => {
    const tramoMeta = TRAMOS_ART49.find((x) => x.id === t.id);
    const citas: PremioCitation[] = [
      cita(
        `${t.id}-pct`,
        "Fórmula del premio",
        `Tramo ${t.id.toUpperCase()}: ${t.nombre}`,
        `${t.porcentajeSueldo}%`
      ),
    ];

    if (tramoMeta?.alcance === "colectivo") {
      citas.push(
        cita(
          `${t.id}-alcance`,
          "Meta de equipo",
          "Depende del cumplimiento de toda el área en el semestre"
        )
      );
    }

    if (t.motivo) {
      citas.push(cita(`${t.id}-motivo`, "Evaluación", t.motivo));
    }

    let explicacion = t.activo
      ? `Sumás ${t.porcentajeSueldo}% del sueldo de referencia ($${t.monto.toLocaleString("es-AR")}).`
      : t.motivo ?? "No aplicó este tramo en el período.";

    if (t.id === "b" && !t.activo && art49.bloqueaTramosCondicionales) {
      explicacion =
        "Los tramos b–e requieren cumplir condiciones individuales (sin sanciones, faltas injustificadas ni impuntualidades graves).";
    }

    return {
      id: t.id,
      titulo: t.nombre,
      explicacion,
      activo: t.activo,
      porcentaje: t.activo ? t.porcentajeSueldo : 0,
      citas,
    };
  });

  const citasGenerales: PremioCitation[] = [
    cita("periodo", "Período", `Cálculo del semestre ${periodoLabel}`),
    cita(
      "antiguedad",
      "Antigüedad",
      art49.elegible
        ? `${art49.antiguedadMeses} meses — cumple requisito mínimo`
        : (art49.motivoInelegible ?? "No elegible"),
      art49.antiguedadMeses
    ),
    cita(
      "sueldo-ref",
      "Sueldo referencia",
      "Básico + antigüedad registrados en legajo",
      art49.sueldoReferencia > 0 ? `$${art49.sueldoReferencia.toLocaleString("es-AR")}` : "Sin datos"
    ),
    cita(
      "asistencia",
      "Asistencia",
      art49.bloqueaTramosCondicionales
        ? `Bloqueo individual: ${art49.inasistenciasInjustificadas} falta(s) injustificada(s)${art49.tieneSancion ? ", sanción registrada" : ""}`
        : art49.tramos.find((t) => t.id === "b")?.activo
          ? "Asistencia perfecta — habilita tramo b y metas colectivas"
          : `Impuntualidades leves: ${art49.impuntualidadesLeves}`,
    ),
  ];

  const recomendaciones: string[] = [];
  if (!art49.elegible) {
    recomendaciones.push("Completá el período de antigüedad mínima para acceder al premio.");
  }
  if (art49.bloqueaTramosCondicionales) {
    recomendaciones.push(
      "Regularizá asistencia: evitá faltas injustificadas, sanciones e impuntualidades mayores a 5 minutos."
    );
  } else if (!art49.tramos.find((t) => t.id === "b")?.activo && art49.impuntualidadesLeves > 0) {
    recomendaciones.push(
      "Reducí impuntualidades leves para habilitar el tramo de asistencia perfecta (+5%)."
    );
  }
  const tramosColectivosOff = art49.tramos.filter(
    (t) => ["c", "d", "e"].includes(t.id) && !t.activo && !art49.bloqueaTramosCondicionales
  );
  if (tramosColectivosOff.length > 0) {
    recomendaciones.push(
      "Metas colectivas pendientes: coordiná con tu área el avance en reparaciones, pulsos o cobranzas."
    );
  }
  if (recomendaciones.length === 0) {
    recomendaciones.push("Mantené el ritmo actual. Revisá Mi asistencia antes del cierre del semestre.");
  }

  const activos = pasos.filter((p) => p.activo);
  const resumen =
    art49.elegible
      ? `Tu premio es ${art49.porcentajeTotal}% del sueldo de referencia (${activos.length} tramo(s) activo(s): ${activos.map((p) => p.titulo).join(", ") || "ninguno"}).`
      : `No tenés premio este semestre: ${art49.motivoInelegible}.`;

  return {
    plantilla: "art49_cooperativo",
    porcentajeTotal: art49.porcentajeTotal,
    titulo: `¿Por qué tengo ${art49.porcentajeTotal}% de premio?`,
    resumen,
    pasos,
    citasGenerales,
    recomendaciones,
  };
}

export function explicarPremioKpiSimple(
  kpiPromedio: number,
  puntajePremio: number,
  config: KpiSimpleConfig,
  periodoLabel: string
): PremioExplicacion {
  const bajoUmbral = kpiPromedio < config.umbralMinimo;
  const pasos: PremioPasoExplicacion[] = [
    {
      id: "kpi",
      titulo: "Cumplimiento KPI promedio",
      explicacion: bajoUmbral
        ? `Tu KPI promedio (${Math.round(kpiPromedio)}%) está por debajo del umbral mínimo (${config.umbralMinimo}%).`
        : `Tu KPI promedio es ${Math.round(kpiPromedio)}%, sobre el umbral de ${config.umbralMinimo}%.`,
      activo: !bajoUmbral,
      porcentaje: puntajePremio,
      citas: [
        cita("kpi-valor", "KPIs del semestre", "Promedio de cumplimiento de tus indicadores", `${Math.round(kpiPromedio)}%`),
        cita("umbral", "Configuración org", "Umbral mínimo para acceder al bono", `${config.umbralMinimo}%`),
      ],
    },
    {
      id: "bono",
      titulo: "Bono proporcional",
      explicacion: bajoUmbral
        ? "Sin bono hasta alcanzar el umbral mínimo."
        : `Bono = ${config.porcentajeMaximo}% × (KPI / 100) = ${puntajePremio}% del sueldo.`,
      activo: !bajoUmbral,
      porcentaje: puntajePremio,
      citas: [
        cita("max", "Configuración org", "Porcentaje máximo si KPI = 100%", `${config.porcentajeMaximo}%`),
      ],
    },
  ];

  const recomendaciones = bajoUmbral
    ? [`Necesitás llegar al ${config.umbralMinimo}% de KPI promedio. Actualizá tus indicadores en riesgo.`]
    : kpiPromedio < 100
      ? [`Subí tu KPI a 100% para alcanzar el máximo de ${config.porcentajeMaximo}%.`]
      : ["Excelente cumplimiento. Mantené el nivel hasta el cierre del semestre."];

  return {
    plantilla: "kpi_simple",
    porcentajeTotal: puntajePremio,
    titulo: `¿Por qué tengo ${puntajePremio}% de bono?`,
    resumen: bajoUmbral
      ? `Sin bono: KPI ${Math.round(kpiPromedio)}% < umbral ${config.umbralMinimo}%.`
      : `Bono del ${puntajePremio}% según KPI promedio ${Math.round(kpiPromedio)}% (máx. ${config.porcentajeMaximo}%).`,
    pasos,
    citasGenerales: [cita("periodo", "Período", `Semestre ${periodoLabel}`)],
    recomendaciones,
  };
}

export function explicarPremioSoloMetricas(periodoLabel: string): PremioExplicacion {
  return {
    plantilla: "solo_metricas",
    porcentajeTotal: 0,
    titulo: "Seguimiento sin premio monetario",
    resumen:
      "Tu organización usa la plantilla Solo métricas: se registran tareas, KPIs y eficiencia sin cálculo de premio.",
    pasos: [],
    citasGenerales: [
      cita("plantilla", "Configuración org", "Plantilla activa: Solo métricas"),
      cita("periodo", "Período", periodoLabel),
    ],
    recomendaciones: ["Enfocate en cumplir objetivos y KPIs; no hay bono semestral configurado."],
  };
}

export function buildPremioExplicacion(input: {
  template: PremioTemplateId;
  puntajePremio: number;
  kpiPromedio: number;
  art49?: PremioArt49;
  kpiSimpleConfig?: KpiSimpleConfig;
  periodoLabel: string;
}): PremioExplicacion {
  if (input.template === "solo_metricas") {
    return explicarPremioSoloMetricas(input.periodoLabel);
  }
  if (input.template === "kpi_simple" && input.kpiSimpleConfig) {
    return explicarPremioKpiSimple(
      input.kpiPromedio,
      input.puntajePremio,
      input.kpiSimpleConfig,
      input.periodoLabel
    );
  }
  if (input.art49) {
    return explicarPremioArt49(input.art49, input.periodoLabel);
  }
  return {
    plantilla: input.template,
    porcentajeTotal: input.puntajePremio,
    titulo: `Premio: ${input.puntajePremio}%`,
    resumen: "No hay detalle disponible para esta plantilla.",
    pasos: [],
    citasGenerales: [],
    recomendaciones: [],
  };
}
