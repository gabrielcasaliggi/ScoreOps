import type { PremioArt49 } from "./art49-types";

export function formatPremioArt49Resumen(art49: PremioArt49): string {
  const activos = art49.tramos.filter((t) => t.activo);
  if (!art49.elegible) return art49.motivoInelegible ?? "No elegible";
  if (activos.length === 0) return "0% del sueldo de referencia";
  const partes = activos.map((t) => `${t.porcentajeSueldo}% (${t.id})`);
  return `${partes.join(" + ")} = ${art49.porcentajeTotal}%`;
}

export function formatMontoPremio(art49: PremioArt49): string {
  if (art49.sueldoReferencia <= 0) {
    return `${art49.porcentajeTotal}% (sin sueldo cargado)`;
  }
  return `$${art49.montoTotal.toLocaleString("es-AR")} (${art49.porcentajeTotal}%)`;
}

export const PREMIO_FORMULA_STEPS = [
  {
    titulo: "a) Base — 30% individual",
    texto:
      "Tramo fijo del premio. Requiere antigüedad mínima de 6 meses al cierre del semestre.",
  },
  {
    titulo: "b) Asistencia perfecta — 5% individual",
    texto:
      "Hasta 5 impuntualidades de hasta 5 minutos cada una. Vacaciones y accidentes de trabajo no penalizan. Sin sanciones ni faltas injustificadas.",
  },
  {
    titulo: "c) Reparaciones — 5% colectivo",
    texto: "95% de reclamos resueltos el mismo día en el semestre (meta de equipo).",
  },
  {
    titulo: "d) Pulsos — 5% colectivo",
    texto: "100% o más respecto al semestre anterior (telecom).",
  },
  {
    titulo: "e) Cobranzas — 5% colectivo",
    texto: "≥80% de cobranza sobre facturación del semestre.",
  },
  {
    titulo: "Liquidación",
    texto:
      "El premio total puede llegar al 50% del sueldo básico más antigüedad. S1 (ene–jun) se paga en septiembre; S2 (jul–dic) en marzo.",
  },
] as const;

/** @deprecated Usar formatPremioArt49Resumen */
export function formatPremioBreakdown(
  _kpiPromedio: number,
  _eficienciaEvaluable: number
): string {
  return "Premio según Art. 49 (tramos a–e)";
}
