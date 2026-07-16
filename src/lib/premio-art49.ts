import type { AsistenciaRegistro, MetaColectivaSemestre } from "@prisma/client";
import type { Art49Config, PremioArt49, TramoId, TramoPremio } from "./art49-types";
import { DEFAULT_ART49_CONFIG, TRAMOS_ART49 } from "./art49-types";
import type { ProductivityPeriod } from "./productivity-period";

const TIPOS_INASISTENCIA_INJUSTIFICADA = new Set([
  "INASISTENCIA_INJUSTIFICADA",
  "SUSPENSION_DISCIPLINARIA",
]);

const TIPOS_SANCION = new Set(["SANCION_DISCIPLINARIA", "SUSPENSION_DISCIPLINARIA"]);

const TIPOS_JUSTIFICADOS_ART49 = new Set([
  "VACACIONES",
  "ACCIDENTE_TRABAJO",
  "PRESENTE",
  "LICENCIA_EXAMEN",
  "LICENCIA_MUDANZA",
  "LICENCIA_GREMIAL",
  "LICENCIA_NACIMIENTO",
  "LICENCIA_FALLECIMIENTO",
  "CARPETA_MEDICA_JUSTIFICADA",
  "OTRO_JUSTIFICADO",
]);

export interface AnalisisAsistenciaArt49 {
  impuntualidadesLeves: number;
  impuntualidadesGraves: number;
  inasistenciasInjustificadas: number;
  tieneSancion: boolean;
  asistenciaPerfecta: boolean;
  /** Bloquea el 20% (tramos b–e): solo sanción o falta injustificada */
  bloqueaTramosCondicionales: boolean;
}

export function analizarAsistenciaArt49(
  registros: Pick<AsistenciaRegistro, "tipo" | "minutosTarde">[],
  config: Art49Config = DEFAULT_ART49_CONFIG
): AnalisisAsistenciaArt49 {
  let impuntualidadesLeves = 0;
  let impuntualidadesGraves = 0;
  let inasistenciasInjustificadas = 0;
  let tieneSancion = false;

  for (const reg of registros) {
    if (TIPOS_SANCION.has(reg.tipo)) {
      tieneSancion = true;
    }
    if (TIPOS_INASISTENCIA_INJUSTIFICADA.has(reg.tipo)) {
      inasistenciasInjustificadas += 1;
    }
    if (reg.tipo === "IMPUNTUALIDAD") {
      const min = reg.minutosTarde ?? 0;
      if (min > 0 && min <= config.impuntualidadMaxMinutos) {
        impuntualidadesLeves += 1;
      } else if (min > config.impuntualidadMaxMinutos) {
        impuntualidadesGraves += 1;
      }
    }
  }

  // CCT: el 20% (b–e) se condiciona a sin sanción y sin ausencia injustificada.
  // La puntualidad solo afecta el tramo b (asistencia).
  const bloqueaTramosCondicionales =
    tieneSancion || inasistenciasInjustificadas > 0;

  const asistenciaPerfecta =
    !bloqueaTramosCondicionales &&
    impuntualidadesGraves === 0 &&
    impuntualidadesLeves <= config.impuntualidadMaxCantidad;

  return {
    impuntualidadesLeves,
    impuntualidadesGraves,
    inasistenciasInjustificadas,
    tieneSancion,
    asistenciaPerfecta,
    bloqueaTramosCondicionales,
  };
}

export function mesesAntiguedad(fechaAlta: Date, ref: Date = new Date()): number {
  const years = ref.getFullYear() - fechaAlta.getFullYear();
  const months = ref.getMonth() - fechaAlta.getMonth();
  let total = years * 12 + months;
  if (ref.getDate() < fechaAlta.getDate()) total -= 1;
  return Math.max(0, total);
}

type MetaTipo = "RECLAMOS" | "VENTAS" | "COBRANZAS";

function metaCumplida(
  tipo: MetaTipo,
  metas: Pick<MetaColectivaSemestre, "tipo" | "valorMeta" | "valorActual">[],
  config: Art49Config
): { cumplida: boolean; valorActual: number; valorMeta: number } {
  const meta = metas.find((m) => m.tipo === tipo);
  const valorMeta =
    meta?.valorMeta ??
    (tipo === "RECLAMOS"
      ? config.metaReclamos
      : tipo === "VENTAS"
        ? config.metaVentas
        : config.metaCobranzas);
  const valorActual = meta?.valorActual ?? 0;
  return { cumplida: valorActual >= valorMeta, valorActual, valorMeta };
}

export function calcularPremioArt49(input: {
  fechaAlta: Date;
  sueldoBasico: number | null;
  valorAntiguedad: number | null;
  asistencias: Pick<AsistenciaRegistro, "tipo" | "minutosTarde">[];
  metasColectivas: Pick<MetaColectivaSemestre, "tipo" | "valorMeta" | "valorActual">[];
  period: ProductivityPeriod;
  config?: Art49Config;
}): PremioArt49 {
  const config = input.config ?? DEFAULT_ART49_CONFIG;
  const refFin = input.period.fin;
  const antiguedadMeses = mesesAntiguedad(input.fechaAlta, refFin);
  const sueldoReferencia = (input.sueldoBasico ?? 0) + (input.valorAntiguedad ?? 0);

  const asistencia = analizarAsistenciaArt49(input.asistencias, config);

  if (antiguedadMeses < config.antiguedadMinimaMeses) {
    return buildResult({
      elegible: false,
      motivoInelegible: `Antigüedad insuficiente (${antiguedadMeses} meses, mínimo ${config.antiguedadMinimaMeses})`,
      antiguedadMeses,
      sueldoReferencia,
      asistencia,
      tramosActivos: {},
      config,
    });
  }

  const reclamos = metaCumplida("RECLAMOS", input.metasColectivas, config);
  const ventas = metaCumplida("VENTAS", input.metasColectivas, config);
  const cob = metaCumplida("COBRANZAS", input.metasColectivas, config);

  const bloqueoMsg = asistencia.tieneSancion
    ? "Sanción disciplinaria en el semestre"
    : asistencia.inasistenciasInjustificadas > 0
      ? "Ausencia injustificada en el semestre"
      : "Requisito individual no cumplido (b–e)";

  const tramosActivos: Record<TramoId, { activo: boolean; motivo?: string }> = {
    a: { activo: true },
    b: {
      activo: !asistencia.bloqueaTramosCondicionales && asistencia.asistenciaPerfecta,
      motivo: asistencia.bloqueaTramosCondicionales
        ? bloqueoMsg
        : asistencia.impuntualidadesGraves > 0
          ? "Impuntualidad mayor a 5 minutos"
          : !asistencia.asistenciaPerfecta
            ? `Impuntualidades leves: ${asistencia.impuntualidadesLeves}/${config.impuntualidadMaxCantidad}`
            : undefined,
    },
    c: {
      activo: !asistencia.bloqueaTramosCondicionales && reclamos.cumplida,
      motivo: asistencia.bloqueaTramosCondicionales
        ? bloqueoMsg
        : !reclamos.cumplida
          ? `Reclamos ${reclamos.valorActual}% / meta ${reclamos.valorMeta}%`
          : undefined,
    },
    d: {
      activo: !asistencia.bloqueaTramosCondicionales && ventas.cumplida,
      motivo: asistencia.bloqueaTramosCondicionales
        ? bloqueoMsg
        : !ventas.cumplida
          ? `Ventas ${ventas.valorActual}% / meta ${ventas.valorMeta}%`
          : undefined,
    },
    e: {
      activo: !asistencia.bloqueaTramosCondicionales && cob.cumplida,
      motivo: asistencia.bloqueaTramosCondicionales
        ? bloqueoMsg
        : !cob.cumplida
          ? `Cobranzas ${cob.valorActual}% / meta ${cob.valorMeta}%`
          : undefined,
    },
  };

  return buildResult({
    elegible: true,
    antiguedadMeses,
    sueldoReferencia,
    asistencia,
    tramosActivos,
    config,
  });
}

function buildResult(params: {
  elegible: boolean;
  motivoInelegible?: string;
  antiguedadMeses: number;
  sueldoReferencia: number;
  asistencia: AnalisisAsistenciaArt49;
  tramosActivos: Partial<Record<TramoId, { activo: boolean; motivo?: string }>>;
  config: Art49Config;
}): PremioArt49 {
  const pctMap: Record<TramoId, number> = {
    a: params.config.tramoA,
    b: params.config.tramoB,
    c: params.config.tramoC,
    d: params.config.tramoD,
    e: params.config.tramoE,
  };

  const tramos: TramoPremio[] = TRAMOS_ART49.map((t) => {
    const activo = params.elegible && (params.tramosActivos[t.id]?.activo ?? false);
    const porcentaje = pctMap[t.id];
    const monto =
      params.sueldoReferencia > 0
        ? Math.round((params.sueldoReferencia * porcentaje) / 100)
        : 0;
    return {
      id: t.id,
      nombre: t.nombre,
      porcentajeSueldo: porcentaje,
      alcance: t.alcance,
      activo,
      monto: activo ? monto : 0,
      motivo: params.tramosActivos[t.id]?.motivo,
    };
  });

  const porcentajeTotal = tramos
    .filter((t) => t.activo)
    .reduce((s, t) => s + t.porcentajeSueldo, 0);

  const montoTotal = tramos.reduce((s, t) => s + t.monto, 0);

  return {
    elegible: params.elegible,
    motivoInelegible: params.motivoInelegible,
    antiguedadMeses: params.antiguedadMeses,
    sueldoReferencia: params.sueldoReferencia,
    tramos,
    porcentajeTotal,
    montoTotal,
    impuntualidadesLeves: params.asistencia.impuntualidadesLeves,
    inasistenciasInjustificadas: params.asistencia.inasistenciasInjustificadas,
    tieneSancion: params.asistencia.tieneSancion,
    bloqueaTramosCondicionales: params.asistencia.bloqueaTramosCondicionales,
  };
}

export { TIPOS_JUSTIFICADOS_ART49 };
