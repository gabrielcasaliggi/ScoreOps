import type { AsistenciaTipo } from "@prisma/client";
import type { PremioConfig } from "./system-config";
import { DEFAULT_PREMIO_CONFIG } from "./system-config";

export interface AsistenciaRegistroInput {
  tipo: AsistenciaTipo;
  minutosTarde?: number | null;
}

const TIPOS_NO_DESCUENTAN: AsistenciaTipo[] = [
  "PRESENTE",
  "VACACIONES",
  "ACCIDENTE_TRABAJO",
  "LICENCIA_EXAMEN",
  "LICENCIA_MUDANZA",
  "LICENCIA_GREMIAL",
  "LICENCIA_NACIMIENTO",
  "LICENCIA_FALLECIMIENTO",
  "CARPETA_MEDICA_JUSTIFICADA",
  "OTRO_JUSTIFICADO",
];

const TIPOS_INASISTENCIA_DIRECTA: AsistenciaTipo[] = [
  "INASISTENCIA_INJUSTIFICADA",
  "SUSPENSION_DISCIPLINARIA",
];

export function tipoDescuentaPremio(tipo: AsistenciaTipo): boolean {
  if (TIPOS_NO_DESCUENTAN.includes(tipo)) return false;
  if (TIPOS_INASISTENCIA_DIRECTA.includes(tipo)) return true;
  return tipo === "IMPUNTUALIDAD";
}

export function contarInasistenciasInjustificadas(
  registros: AsistenciaRegistroInput[],
  config: PremioConfig = DEFAULT_PREMIO_CONFIG
): number {
  let total = 0;

  for (const reg of registros) {
    if (reg.tipo === "INASISTENCIA_INJUSTIFICADA" || reg.tipo === "SUSPENSION_DISCIPLINARIA") {
      total += 1;
      continue;
    }

    if (reg.tipo === "IMPUNTUALIDAD") {
      const minutos = reg.minutosTarde ?? 0;
      if (minutos > config.impuntualidadMinutos) {
        total += 1;
      }
    }
  }

  return total;
}

export function calcularMultiplicadorPresentismo(
  inasistencias: number,
  config: PremioConfig = DEFAULT_PREMIO_CONFIG
): number {
  if (inasistencias >= config.topeFaltasPerdidaTotal) {
    return config.descuentosPorFaltas[String(config.topeFaltasPerdidaTotal)] ?? 0;
  }
  return config.descuentosPorFaltas[String(inasistencias)] ?? 1;
}

export const ASISTENCIA_TIPO_LABELS: Record<AsistenciaTipo, string> = {
  PRESENTE: "Presente",
  IMPUNTUALIDAD: "Impuntualidad",
  INASISTENCIA_INJUSTIFICADA: "Inasistencia injustificada",
  VACACIONES: "Vacaciones",
  LICENCIA_EXAMEN: "Licencia por examen",
  LICENCIA_MUDANZA: "Licencia por mudanza",
  LICENCIA_GREMIAL: "Licencia gremial",
  LICENCIA_NACIMIENTO: "Licencia por nacimiento",
  LICENCIA_FALLECIMIENTO: "Licencia por fallecimiento",
  CARPETA_MEDICA_JUSTIFICADA: "Carpeta médica justificada",
  ACCIDENTE_TRABAJO: "Accidente de trabajo",
  SANCION_DISCIPLINARIA: "Sanción disciplinaria",
  SUSPENSION_DISCIPLINARIA: "Suspensión disciplinaria",
  OTRO_JUSTIFICADO: "Otro justificado",
};
