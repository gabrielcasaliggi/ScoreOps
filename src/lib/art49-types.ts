/** Art. 49 — Premio por productividad (Convenio Cooperativo) */

export interface Art49Config {
  antiguedadMinimaMeses: number;
  tramoA: number;
  tramoB: number;
  tramoC: number;
  tramoD: number;
  tramoE: number;
  impuntualidadMaxMinutos: number;
  impuntualidadMaxCantidad: number;
  metaReclamos: number;
  metaVentas: number;
  metaCobranzas: number;
}

export const DEFAULT_ART49_CONFIG: Art49Config = {
  antiguedadMinimaMeses: 6,
  tramoA: 30,
  tramoB: 5,
  tramoC: 5,
  tramoD: 5,
  tramoE: 5,
  impuntualidadMaxMinutos: 5,
  impuntualidadMaxCantidad: 5,
  metaReclamos: 95,
  metaVentas: 100,
  metaCobranzas: 80,
};

export const TRAMOS_ART49 = [
  { id: "a" as const, nombre: "Base productividad", alcance: "individual" as const },
  { id: "b" as const, nombre: "Asistencia", alcance: "individual" as const },
  { id: "c" as const, nombre: "Reclamos (95% cumplidos)", alcance: "colectivo" as const },
  {
    id: "d" as const,
    nombre: "Ventas / productos activos (100% vs sem. anterior)",
    alcance: "colectivo" as const,
  },
  { id: "e" as const, nombre: "Cobranzas (≥80%)", alcance: "colectivo" as const },
];

export type TramoId = "a" | "b" | "c" | "d" | "e";

export interface TramoPremio {
  id: TramoId;
  nombre: string;
  porcentajeSueldo: number;
  alcance: "individual" | "colectivo";
  activo: boolean;
  monto: number;
  motivo?: string;
}

export interface PremioArt49 {
  elegible: boolean;
  motivoInelegible?: string;
  antiguedadMeses: number;
  sueldoReferencia: number;
  tramos: TramoPremio[];
  porcentajeTotal: number;
  montoTotal: number;
  impuntualidadesLeves: number;
  inasistenciasInjustificadas: number;
  tieneSancion: boolean;
  bloqueaTramosCondicionales: boolean;
}

/** Normaliza JSON legacy (metaReparaciones / metaPulsos) al shape actual. */
export function normalizeArt49Config(
  raw: Partial<Art49Config> & {
    metaReparaciones?: number;
    metaPulsos?: number;
  }
): Art49Config {
  const {
    metaReparaciones,
    metaPulsos,
    metaReclamos,
    metaVentas,
    ...rest
  } = raw;
  return {
    ...DEFAULT_ART49_CONFIG,
    ...rest,
    metaReclamos: metaReclamos ?? metaReparaciones ?? DEFAULT_ART49_CONFIG.metaReclamos,
    metaVentas: metaVentas ?? metaPulsos ?? DEFAULT_ART49_CONFIG.metaVentas,
  };
}
