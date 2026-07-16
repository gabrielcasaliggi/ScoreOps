import type { MetaColectivaSemestre } from "@prisma/client";
import { prisma } from "./prisma";
import type { Art49Config } from "./art49-types";
import { DEFAULT_ART49_CONFIG } from "./art49-types";
import { getArt49Config } from "./system-config";

const TIPOS = ["RECLAMOS", "VENTAS", "COBRANZAS"] as const;

function defaultMetaForTipo(
  tipo: (typeof TIPOS)[number],
  config: Art49Config
): number {
  if (tipo === "RECLAMOS") return config.metaReclamos;
  if (tipo === "VENTAS") return config.metaVentas;
  return config.metaCobranzas;
}

export async function ensureMetasColectivas(
  organizationId: string,
  periodoId: string,
  config?: Art49Config
): Promise<MetaColectivaSemestre[]> {
  const cfg = config ?? (await getArt49Config(organizationId));
  const existing = await prisma.metaColectivaSemestre.findMany({
    where: { organizationId, periodoId },
  });

  const byTipo = new Map(existing.map((m) => [m.tipo, m]));

  for (const tipo of TIPOS) {
    if (!byTipo.has(tipo)) {
      const created = await prisma.metaColectivaSemestre.create({
        data: {
          organizationId,
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
  organizationId: string,
  periodoId: string
): Promise<MetaColectivaSemestre[]> {
  return ensureMetasColectivas(organizationId, periodoId);
}

export { DEFAULT_ART49_CONFIG };
