import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { ensureMetasColectivas } from "@/lib/metas-colectivas";
import { parsePeriodoParam, periodoToApiPayload } from "@/lib/productivity-period";
import { isPremioHabilitado } from "@/lib/tenant";

const updateMetaSchema = z.object({
  periodoId: z.string().optional(),
  tipo: z.enum(["RECLAMOS", "VENTAS", "COBRANZAS"]),
  valorMeta: z.number().min(0).max(200).optional(),
  valorActual: z.number().min(0).max(200).optional(),
  observacion: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  if (!(await isPremioHabilitado(user.organizationId))) {
    return apiError("Premio no habilitado en esta organización", 403);
  }

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));
  const metas = await ensureMetasColectivas(user.organizationId, period.id);

  return apiSuccess({
    metas,
    periodo: periodoToApiPayload(period),
  });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  if (!(await isPremioHabilitado(user.organizationId))) {
    return apiError("Premio no habilitado en esta organización", 403);
  }

  try {
    const body = await request.json();
    const parsed = updateMetaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const period = parsePeriodoParam(parsed.data.periodoId ?? null);
    await ensureMetasColectivas(user.organizationId, period.id);

    const updated = await prisma.metaColectivaSemestre.update({
      where: {
        organizationId_periodoId_tipo: {
          organizationId: user.organizationId,
          periodoId: period.id,
          tipo: parsed.data.tipo,
        },
      },
      data: {
        ...(parsed.data.valorMeta !== undefined && { valorMeta: parsed.data.valorMeta }),
        ...(parsed.data.valorActual !== undefined && { valorActual: parsed.data.valorActual }),
        ...(parsed.data.observacion !== undefined && { observacion: parsed.data.observacion }),
      },
    });

    return apiSuccess({ meta: updated, periodo: periodoToApiPayload(period) });
  } catch (err) {
    console.error("[Premio Colectivas]", err);
    return apiError("Error al actualizar meta colectiva", 500);
  }
}
