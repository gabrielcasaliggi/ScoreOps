import type { Prisma, ScoreAuditEvento } from "@prisma/client";
import { prisma } from "./prisma";
import type { PremioArt49 } from "./art49-types";

export interface ScoreAuditInput {
  userId: string;
  periodoId: string;
  evento: ScoreAuditEvento;
  art49: PremioArt49;
  gestionInternaPuntaje?: number;
  detalle: Prisma.InputJsonValue;
  realizadoPorId?: string;
}

export async function persistScoreAudit(input: ScoreAuditInput): Promise<void> {
  const tramoBase = input.art49.tramos.find((t) => t.id === "a");

  await prisma.scoreAuditLog.create({
    data: {
      userId: input.userId,
      periodoId: input.periodoId,
      evento: input.evento,
      puntajeBase: tramoBase?.porcentajeSueldo ?? input.art49.porcentajeTotal,
      inasistencias: input.art49.inasistenciasInjustificadas,
      multiplicador: input.art49.porcentajeTotal / 50,
      puntajeFinal: input.art49.porcentajeTotal,
      detalle: JSON.parse(
        JSON.stringify({
          ...(typeof input.detalle === "object" && input.detalle !== null ? input.detalle : {}),
          art49: input.art49,
          gestionInternaPuntaje: input.gestionInternaPuntaje,
        })
      ) as Prisma.InputJsonValue,
      realizadoPorId: input.realizadoPorId,
    },
  });
}
