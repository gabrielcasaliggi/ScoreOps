import type { AsistenciaRegistro } from "@prisma/client";
import {
  calculateProductivityBonus,
  type GestionInternaBonus,
} from "./productivity";
import {
  calcularMultiplicadorPresentismo,
  contarInasistenciasInjustificadas,
} from "./asistencia";
import { getPremioConfig, type PremioConfig } from "./system-config";

/** @deprecated Modelo FOETRA — reemplazado por Art. 49 en premio-art49.ts */

export interface PremioPresentismo {
  inasistenciasInjustificadas: number;
  multiplicador: number;
  puntajeBase: number;
  puntajeFinal: number;
  tablaAplicada: string;
}

export interface PremioSemestralLegacy extends GestionInternaBonus {
  presentismo: PremioPresentismo;
}

export function calcularPremioConPresentismo(
  puntajeBase: number,
  asistencias: Pick<AsistenciaRegistro, "tipo" | "minutosTarde">[],
  config?: PremioConfig
): PremioPresentismo {
  const premioConfig = config ?? undefined;
  const inasistencias = contarInasistenciasInjustificadas(asistencias, premioConfig);
  const multiplicador = calcularMultiplicadorPresentismo(inasistencias, premioConfig);
  const puntajeFinal = Math.round(puntajeBase * multiplicador * 10) / 10;

  const tabla =
    inasistencias >= 3
      ? "3+ faltas: pérdida total"
      : `${inasistencias} falta(s): ×${multiplicador}`;

  return {
    inasistenciasInjustificadas: inasistencias,
    multiplicador,
    puntajeBase,
    puntajeFinal,
    tablaAplicada: tabla,
  };
}

export async function buildPremioSemestralLegacy(
  tareas: Parameters<typeof calculateProductivityBonus>[0],
  kpiPromedio: number,
  asistencias: Pick<AsistenciaRegistro, "tipo" | "minutosTarde">[]
): Promise<PremioSemestralLegacy> {
  const config = await getPremioConfig();
  const bonus = calculateProductivityBonus(tareas, kpiPromedio);
  const presentismo = calcularPremioConPresentismo(
    bonus.puntajePremio,
    asistencias,
    config
  );

  return {
    ...bonus,
    presentismo,
  };
}
