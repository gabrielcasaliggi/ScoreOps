import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { ensureMetasColectivas } from "@/lib/metas-colectivas";
import { getSemesterPeriod, periodoToApiPayload } from "@/lib/productivity-period";
import { syncReclamosFromTramites } from "@/lib/reclamos-tramites";
import { isPremioHabilitado } from "@/lib/tenant";

export async function POST() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  if (!(await isPremioHabilitado(user.organizationId))) {
    return apiError("Premio no habilitado en esta organización", 403);
  }

  try {
    const period = getSemesterPeriod(0);
    await ensureMetasColectivas(user.organizationId, period.id);
    const sync = await syncReclamosFromTramites(user.organizationId, period);

    if (!sync.hasData || sync.porcentaje == null) {
      return apiSuccess({
        updated: false,
        sync,
        message: sync.nota,
        periodo: periodoToApiPayload(period),
      });
    }

    const meta = await prisma.metaColectivaSemestre.update({
      where: {
        organizationId_periodoId_tipo: {
          organizationId: user.organizationId,
          periodoId: period.id,
          tipo: "RECLAMOS",
        },
      },
      data: {
        valorActual: sync.porcentaje,
        observacion: sync.nota,
      },
    });

    return apiSuccess({
      updated: true,
      meta,
      sync,
      message: `Reclamos actualizados a ${sync.porcentaje}%`,
      periodo: periodoToApiPayload(period),
    });
  } catch (err) {
    console.error("[Premio Sync Reclamos]", err);
    return apiError("Error al sincronizar reclamos", 500);
  }
}
