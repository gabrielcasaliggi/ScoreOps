import type { ProductivityPeriod } from "./productivity-period";

/**
 * Contrato esperado de la API de trámites / reclamos técnicos.
 * Cada evento representa un reclamo con fecha y si quedó cumplido.
 */
export interface TramiteReclamoEvento {
  fecha: Date | string;
  estadoCumplido: boolean;
  /** Id externo opcional para trazabilidad */
  idExterno?: string;
}

export interface SyncReclamosResult {
  /** false si el stub/API no devolvió eventos (no pisar valor manual) */
  hasData: boolean;
  porcentaje: number | null;
  total: number;
  cumplidos: number;
  fuente: "stub" | "api";
  nota: string;
}

/**
 * % de reclamos cumplidos dentro del semestre.
 * Sin eventos → null (caller no debe sobrescribir carga manual).
 */
export function calcularPorcentajeReclamosSemestre(
  eventos: TramiteReclamoEvento[],
  period: Pick<ProductivityPeriod, "inicio" | "fin">
): number | null {
  const enPeriodo = eventos.filter((e) => {
    const f = e.fecha instanceof Date ? e.fecha : new Date(e.fecha);
    return f >= period.inicio && f <= period.fin;
  });
  if (enPeriodo.length === 0) return null;
  const cumplidos = enPeriodo.filter((e) => e.estadoCumplido).length;
  return Math.round((cumplidos / enPeriodo.length) * 1000) / 10;
}

/**
 * Stub: sin integración HTTP real.
 * Cuando exista la API, reemplazar por fetch autenticado y mapear al contrato.
 */
export async function fetchTramitesReclamosStub(
  _organizationId: string,
  _period: Pick<ProductivityPeriod, "inicio" | "fin" | "id">
): Promise<TramiteReclamoEvento[]> {
  // TODO(integración): GET API trámites filtrando por org + rango de fechas
  // y mapear { fecha, estadoCumplido } desde el payload real.
  return [];
}

export async function syncReclamosFromTramites(
  organizationId: string,
  period: ProductivityPeriod
): Promise<SyncReclamosResult> {
  const eventos = await fetchTramitesReclamosStub(organizationId, period);
  const porcentaje = calcularPorcentajeReclamosSemestre(eventos, period);
  const total = eventos.filter((e) => {
    const f = e.fecha instanceof Date ? e.fecha : new Date(e.fecha);
    return f >= period.inicio && f <= period.fin;
  }).length;
  const cumplidos = eventos.filter((e) => {
    const f = e.fecha instanceof Date ? e.fecha : new Date(e.fecha);
    return f >= period.inicio && f <= period.fin && e.estadoCumplido;
  }).length;

  if (porcentaje == null) {
    return {
      hasData: false,
      porcentaje: null,
      total: 0,
      cumplidos: 0,
      fuente: "stub",
      nota: "API de trámites aún no conectada: se mantiene el avance cargado a mano.",
    };
  }

  return {
    hasData: true,
    porcentaje,
    total,
    cumplidos,
    fuente: "stub",
    nota: `Calculado desde ${total} reclamo(s) del semestre (${cumplidos} cumplidos).`,
  };
}
