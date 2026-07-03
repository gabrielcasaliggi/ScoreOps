/** Plantillas del motor de reglas de premio (Fase 1) */

export type PremioTemplateId = "art49_cooperativo" | "kpi_simple" | "solo_metricas";

export interface PremioTemplateMeta {
  id: PremioTemplateId;
  nombre: string;
  descripcion: string;
  tienePremioMonetario: boolean;
}

export const PREMIO_TEMPLATES: PremioTemplateMeta[] = [
  {
    id: "art49_cooperativo",
    nombre: "Art. 49 — Cooperativo",
    descripcion:
      "Tramos a–e del convenio: productividad individual, asistencia, metas colectivas.",
    tienePremioMonetario: true,
  },
  {
    id: "kpi_simple",
    nombre: "Bono por KPI",
    descripcion:
      "Porcentaje del sueldo según cumplimiento KPI promedio. Sin tramos legales ni metas colectivas.",
    tienePremioMonetario: true,
  },
  {
    id: "solo_metricas",
    nombre: "Solo métricas",
    descripcion:
      "Tareas, KPIs y eficiencia sin cálculo de premio monetario. Ideal para pilotos o seguimiento puro.",
    tienePremioMonetario: false,
  },
];

export interface KpiSimpleConfig {
  /** KPI mínimo (%) para acceder al bono */
  umbralMinimo: number;
  /** Porcentaje máximo del sueldo si KPI = 100% */
  porcentajeMaximo: number;
}

export const DEFAULT_KPI_SIMPLE_CONFIG: KpiSimpleConfig = {
  umbralMinimo: 70,
  porcentajeMaximo: 15,
};

export function calcularPremioKpiSimple(
  kpiPromedio: number,
  config: KpiSimpleConfig = DEFAULT_KPI_SIMPLE_CONFIG
): number {
  if (kpiPromedio < config.umbralMinimo) return 0;
  const escala = Math.min(100, kpiPromedio) / 100;
  return Math.round(config.porcentajeMaximo * escala * 10) / 10;
}

export function getPremioTemplateMeta(id: PremioTemplateId): PremioTemplateMeta {
  return PREMIO_TEMPLATES.find((t) => t.id === id) ?? PREMIO_TEMPLATES[0];
}
