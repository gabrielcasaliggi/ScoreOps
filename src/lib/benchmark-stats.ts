import type { EmployeeProductivityExtended } from "./employee-stats";

export interface BenchmarkMetric {
  id: string;
  label: string;
  valorPropio: number;
  valorArea: number;
  valorOrg: number;
  unidad: "%" | "pts";
  deltaVsArea: number;
  deltaVsOrg: number;
  posicionEnArea: number;
  totalEnArea: number;
}

export interface BenchmarkResult {
  areaNombre: string;
  periodoLabel: string;
  metricas: BenchmarkMetric[];
  resumen: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeBenchmark(
  empleado: EmployeeProductivityExtended,
  areaStats: EmployeeProductivityExtended[],
  orgStats: EmployeeProductivityExtended[],
  areaNombre: string,
  periodoLabel: string
): BenchmarkResult {
  const avg = (list: EmployeeProductivityExtended[], fn: (e: EmployeeProductivityExtended) => number) =>
    list.length > 0 ? list.reduce((s, e) => s + fn(e), 0) / list.length : 0;

  const kpiPropio = empleado.kpiPromedio;
  const kpiArea = avg(areaStats, (e) => e.kpiPromedio);
  const kpiOrg = avg(orgStats, (e) => e.kpiPromedio);

  const premioPropio = empleado.productivityBonus.puntajePremio;
  const premioArea = avg(areaStats, (e) => e.productivityBonus.puntajePremio);
  const premioOrg = avg(orgStats, (e) => e.productivityBonus.puntajePremio);

  const effPropio = empleado.productivityBonus.eficienciaEvaluable;
  const effArea = avg(areaStats, (e) => e.productivityBonus.eficienciaEvaluable);
  const effOrg = avg(orgStats, (e) => e.productivityBonus.eficienciaEvaluable);

  const rankingArea = [...areaStats]
    .sort((a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio)
    .findIndex((e) => e.userId === empleado.userId) + 1;

  const metricas: BenchmarkMetric[] = [
    {
      id: "kpi",
      label: "KPI promedio",
      valorPropio: round1(kpiPropio),
      valorArea: round1(kpiArea),
      valorOrg: round1(kpiOrg),
      unidad: "%",
      deltaVsArea: round1(kpiPropio - kpiArea),
      deltaVsOrg: round1(kpiPropio - kpiOrg),
      posicionEnArea: rankingArea,
      totalEnArea: areaStats.length,
    },
    {
      id: "premio",
      label: "Premio semestral",
      valorPropio: round1(premioPropio),
      valorArea: round1(premioArea),
      valorOrg: round1(premioOrg),
      unidad: "%",
      deltaVsArea: round1(premioPropio - premioArea),
      deltaVsOrg: round1(premioPropio - premioOrg),
      posicionEnArea: rankingArea,
      totalEnArea: areaStats.length,
    },
    {
      id: "eficiencia",
      label: "Eficiencia evaluable",
      valorPropio: round1(effPropio),
      valorArea: round1(effArea),
      valorOrg: round1(effOrg),
      unidad: "%",
      deltaVsArea: round1(effPropio - effArea),
      deltaVsOrg: round1(effPropio - effOrg),
      posicionEnArea: rankingArea,
      totalEnArea: areaStats.length,
    },
  ];

  const mejorQueArea = metricas.filter((m) => m.deltaVsArea > 0).length;
  const resumen =
    areaStats.length <= 1
      ? "Sos el único empleado en tu área; compará con el promedio de la organización."
      : mejorQueArea >= 2
        ? `Estás por encima del promedio de ${areaNombre} en ${mejorQueArea} de 3 métricas. Posición premio: ${rankingArea}/${areaStats.length} en tu área.`
        : `Comparado con ${areaNombre}: KPI ${kpiPropio >= kpiArea ? "igual o mejor" : "por debajo"}, premio ${premioPropio >= premioArea ? "igual o mejor" : "por debajo"} que el promedio del área.`;

  return { areaNombre, periodoLabel, metricas, resumen };
}

export interface AreaBenchmarkRow {
  area: string;
  empleados: number;
  kpiPromedio: number;
  premioPromedio: number;
  eficienciaPromedio: number;
  vsOrgKpi: number;
  vsOrgPremio: number;
}

export function computeAreaBenchmark(
  orgStats: EmployeeProductivityExtended[]
): { orgPromedios: { kpi: number; premio: number; eficiencia: number }; areas: AreaBenchmarkRow[] } {
  const avg = (list: EmployeeProductivityExtended[], fn: (e: EmployeeProductivityExtended) => number) =>
    list.length > 0 ? round1(list.reduce((s, e) => s + fn(e), 0) / list.length) : 0;

  const orgKpi = avg(orgStats, (e) => e.kpiPromedio);
  const orgPremio = avg(orgStats, (e) => e.productivityBonus.puntajePremio);
  const orgEff = avg(orgStats, (e) => e.productivityBonus.eficienciaEvaluable);

  const byArea = orgStats.reduce<Record<string, EmployeeProductivityExtended[]>>((acc, e) => {
    if (!acc[e.area]) acc[e.area] = [];
    acc[e.area].push(e);
    return acc;
  }, {});

  const areas: AreaBenchmarkRow[] = Object.entries(byArea).map(([area, list]) => ({
    area,
    empleados: list.length,
    kpiPromedio: avg(list, (e) => e.kpiPromedio),
    premioPromedio: avg(list, (e) => e.productivityBonus.puntajePremio),
    eficienciaPromedio: avg(list, (e) => e.productivityBonus.eficienciaEvaluable),
    vsOrgKpi: round1(avg(list, (e) => e.kpiPromedio) - orgKpi),
    vsOrgPremio: round1(avg(list, (e) => e.productivityBonus.puntajePremio) - orgPremio),
  }));

  areas.sort((a, b) => b.premioPromedio - a.premioPromedio);

  return {
    orgPromedios: { kpi: orgKpi, premio: orgPremio, eficiencia: orgEff },
    areas,
  };
}
