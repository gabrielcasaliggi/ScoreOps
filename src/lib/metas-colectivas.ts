import type { MetaColectivaSemestre } from "@prisma/client";
import { prisma } from "./prisma";
import type { Art49Config } from "./art49-types";
import { DEFAULT_ART49_CONFIG } from "./art49-types";
import { getArt49Config } from "./system-config";

const TIPOS = ["REPARACIONES", "PULSOS", "COBRANZAS"] as const;

function defaultMetaForTipo(
  tipo: (typeof TIPOS)[number],
  config: Art49Config
): number {
  if (tipo === "REPARACIONES") return config.metaReparaciones;
  if (tipo === "PULSOS") return config.metaPulsos;
  return config.metaCobranzas;
}

export async function ensureMetasColectivas(
  periodoId: string,
  config?: Art49Config
): Promise<MetaColectivaSemestre[]> {
  const cfg = config ?? (await getArt49Config());
  const existing = await prisma.metaColectivaSemestre.findMany({
    where: { periodoId },
  });

  const byTipo = new Map(existing.map((m) => [m.tipo, m]));

  for (const tipo of TIPOS) {
    if (!byTipo.has(tipo)) {
      const created = await prisma.metaColectivaSemestre.create({
        data: {
          periodoId,
          tipo,
          valorMeta: defaultMetaForTipo(tipo, cfg),
          valorActual: 0,
        },
      });
      byTipo.set(tipo, created);
    }
  }

  return TIPOS.map((t) => byTipo.get(t)!);
}

export async function getMetasColectivas(
  periodoId: string
): Promise<MetaColectivaSemestre[]> {
  return ensureMetasColectivas(periodoId);
}

export { DEFAULT_ART49_CONFIG };
