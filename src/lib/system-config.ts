import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Art49Config } from "./art49-types";
import { DEFAULT_ART49_CONFIG } from "./art49-types";

/** @deprecated Modelo FOETRA anterior — conservado solo por compatibilidad de lectura */
export interface PremioConfig {
  impuntualidadMinutos: number;
  descuentosPorFaltas: Record<string, number>;
  topeFaltasPerdidaTotal: number;
}

export const DEFAULT_PREMIO_CONFIG: PremioConfig = {
  impuntualidadMinutos: 15,
  descuentosPorFaltas: {
    "0": 1,
    "1": 0.7,
    "2": 0.4,
    "3": 0,
  },
  topeFaltasPerdidaTotal: 3,
};

export const DEFAULT_EVALUACION_360_PESOS = {
  autoevaluacion: 0.1,
  gerente: 0.4,
  par: 0.3,
  subordinado: 0.2,
};

export type Evaluacion360Pesos = typeof DEFAULT_EVALUACION_360_PESOS;

const CONFIG_KEYS = {
  premio: "premio.config",
  art49: "premio.art49",
  evaluacion360: "evaluacion360.pesos",
} as const;

export async function getEvaluacion360Pesos(): Promise<Evaluacion360Pesos> {
  const row = await prisma.systemConfig.findUnique({
    where: { clave: CONFIG_KEYS.evaluacion360 },
  });
  if (!row) return DEFAULT_EVALUACION_360_PESOS;
  return { ...DEFAULT_EVALUACION_360_PESOS, ...(row.valor as unknown as Evaluacion360Pesos) };
}

export async function getPremioConfig(): Promise<PremioConfig> {
  const row = await prisma.systemConfig.findUnique({
    where: { clave: CONFIG_KEYS.premio },
  });
  if (!row) return DEFAULT_PREMIO_CONFIG;
  return { ...DEFAULT_PREMIO_CONFIG, ...(row.valor as unknown as PremioConfig) };
}

export async function getArt49Config(): Promise<Art49Config> {
  const row = await prisma.systemConfig.findUnique({
    where: { clave: CONFIG_KEYS.art49 },
  });
  if (!row) return DEFAULT_ART49_CONFIG;
  return { ...DEFAULT_ART49_CONFIG, ...(row.valor as unknown as Art49Config) };
}

export async function setArt49Config(
  config: Partial<Art49Config>,
  updatedById?: string
): Promise<Art49Config> {
  const current = await getArt49Config();
  const merged = { ...current, ...config };
  const valor: Prisma.InputJsonValue = JSON.parse(JSON.stringify(merged));

  await prisma.systemConfig.upsert({
    where: { clave: CONFIG_KEYS.art49 },
    create: {
      clave: CONFIG_KEYS.art49,
      valor,
      descripcion: "Art. 49 — Premio por productividad (tramos a–e)",
      updatedById,
    },
    update: {
      valor,
      updatedById,
    },
  });

  return merged;
}

export async function setPremioConfig(
  config: Partial<PremioConfig>,
  updatedById?: string
): Promise<PremioConfig> {
  const current = await getPremioConfig();
  const merged = { ...current, ...config };
  const valor: Prisma.InputJsonValue = JSON.parse(JSON.stringify(merged));

  await prisma.systemConfig.upsert({
    where: { clave: CONFIG_KEYS.premio },
    create: {
      clave: CONFIG_KEYS.premio,
      valor,
      descripcion: "Parámetros del premio semestral por productividad y presentismo",
      updatedById,
    },
    update: {
      valor,
      updatedById,
    },
  });

  return merged;
}

export async function seedSystemConfig(): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { clave: CONFIG_KEYS.art49 },
    update: {},
    create: {
      clave: CONFIG_KEYS.art49,
      valor: JSON.parse(JSON.stringify(DEFAULT_ART49_CONFIG)) as Prisma.InputJsonValue,
      descripcion: "Art. 49 — Premio por productividad (tramos a–e)",
    },
  });

  await prisma.systemConfig.upsert({
    where: { clave: CONFIG_KEYS.premio },
    update: {},
    create: {
      clave: CONFIG_KEYS.premio,
      valor: JSON.parse(JSON.stringify(DEFAULT_PREMIO_CONFIG)) as Prisma.InputJsonValue,
      descripcion: "Parámetros legacy del premio (FOETRA)",
    },
  });

  await prisma.systemConfig.upsert({
    where: { clave: CONFIG_KEYS.evaluacion360 },
    update: {},
    create: {
      clave: CONFIG_KEYS.evaluacion360,
      valor: JSON.parse(JSON.stringify(DEFAULT_EVALUACION_360_PESOS)) as Prisma.InputJsonValue,
      descripcion: "Ponderación de evaluaciones 360°",
    },
  });
}
