import type { PremioArt49 } from "./art49-types";
import type { ProductivityBonus } from "./productivity";

export function formatPremioArt49Resumen(art49: PremioArt49): string {
  const activos = art49.tramos.filter((t) => t.activo);
  if (!art49.elegible) return art49.motivoInelegible ?? "No elegible";
  if (activos.length === 0) return "0% del sueldo de referencia";
  const partes = activos.map((t) => `${t.porcentajeSueldo}% (${t.id})`);
  return `${partes.join(" + ")} = ${art49.porcentajeTotal}%`;
}

export function formatPremioResumen(bonus: Pick<ProductivityBonus, "puntajePremio" | "art49" | "premioTemplate">): string {
  if (bonus.art49) return formatPremioArt49Resumen(bonus.art49);
  if (bonus.premioTemplate === "kpi_simple") {
    return `Bono por KPI: ${bonus.puntajePremio}% del sueldo`;
  }
  if (bonus.premioTemplate === "solo_metricas") {
    return "Sin premio monetario (solo métricas)";
  }
  return `${bonus.puntajePremio}% del sueldo`;
}

export function formatMontoPremio(art49: PremioArt49): string {
  if (art49.sueldoReferencia <= 0) {
    return `${art49.porcentajeTotal}% (sin sueldo cargado)`;
  }
  return `$${art49.montoTotal.toLocaleString("es-AR")} (${art49.porcentajeTotal}%)`;
}

export const PREMIO_FORMULA_STEPS = [
  {
    titulo: "a) Base personal — 30%",
    texto:
      "Fijo si al cierre del semestre tenés al menos 6 meses de antigüedad (fecha de ingreso).",
  },
  {
    titulo: "b) Asistencia — 5% individual",
    texto:
      "Sin faltas injustificadas ni sanciones. Hasta 5 llegadas tarde de hasta 5 minutos. Vacaciones y accidentes de trabajo no restan.",
  },
  {
    titulo: "c) Reclamos — 5% colectivo",
    texto: "El equipo cumple el 95% de reclamos técnicos en el semestre.",
  },
  {
    titulo: "d) Ventas / productos activos — 5% colectivo",
    texto:
      "Se mantiene o supera el 100% de ventas/productos/clientes vs el semestre anterior (reemplaza el concepto obsoleto de pulsos).",
  },
  {
    titulo: "e) Cobranzas — 5% colectivo",
    texto: "Se cobra al menos el 80% de lo facturado en el semestre.",
  },
  {
    titulo: "Condición del 20% (b–e)",
    texto:
      "Los tramos de asistencia y metas de equipo solo se abonan si no hay sanción disciplinaria ni ausencia injustificada en el semestre.",
  },
  {
    titulo: "¿Cuándo se paga?",
    texto:
      "Máximo 50% del sueldo básico + antigüedad. Oct–mar se liquida en abril; abr–sep en octubre (con las novedades del mes anterior).",
  },
] as const;

/** @deprecated Usar formatPremioArt49Resumen */
export function formatPremioBreakdown(
  _kpiPromedio: number,
  _eficienciaEvaluable: number
): string {
  return "Premio según Art. 49 (tramos a–e)";
}
