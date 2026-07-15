import { prisma } from "./prisma";
import { calculateKpiCompliance } from "./productivity";

const KPI_RISK_THRESHOLD = 50;
const OBJETIVO_DIAS_ALERTA = 7;

export async function generateNotificationsForUser(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      objetivos: { include: { kpis: true } },
      tareas: true,
    },
  });

  if (!user) return 0;

  const now = new Date();
  let created = 0;

  for (const objetivo of user.objetivos) {
    const diasRestantes = Math.ceil(
      (objetivo.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diasRestantes > 0 && diasRestantes <= OBJETIVO_DIAS_ALERTA) {
      const exists = await prisma.notification.findFirst({
        where: {
          userId,
          tipo: "OBJETIVO_PROXIMO",
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          metadata: { path: ["objetivoId"], equals: objetivo.id },
        },
      });

      if (!exists) {
        await prisma.notification.create({
          data: {
            userId,
            tipo: "OBJETIVO_PROXIMO",
            titulo: "Objetivo próximo a vencer",
            mensaje: `"${objetivo.titulo}" vence en ${diasRestantes} día(s).`,
            metadata: {
              objetivoId: objetivo.id,
              diasRestantes,
              actionUrl: "/dashboard/objetivos",
            },
          },
        });
        created++;
      }
    }

    for (const kpi of objetivo.kpis) {
      const compliance = calculateKpiCompliance(kpi);
      if (compliance.cumplimiento < KPI_RISK_THRESHOLD) {
        const exists = await prisma.notification.findFirst({
          where: {
            userId,
            tipo: "KPI_RIESGO",
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            metadata: { path: ["kpiId"], equals: kpi.id },
          },
        });

        if (!exists) {
        await prisma.notification.create({
          data: {
            userId,
            tipo: "KPI_RIESGO",
            titulo: "KPI en riesgo",
            mensaje: `"${kpi.nombre}" está al ${Math.round(compliance.cumplimiento)}% del objetivo.`,
            metadata: {
              kpiId: kpi.id,
              cumplimiento: compliance.cumplimiento,
              actionUrl: "/dashboard",
            },
          },
        });
          created++;
        }
      }
    }
  }

  for (const tarea of user.tareas) {
    if (
      tarea.fechaLimite &&
      tarea.fechaLimite < now &&
      tarea.estado !== "COMPLETADA"
    ) {
      const exists = await prisma.notification.findFirst({
        where: {
          userId,
          tipo: "TAREA_VENCIDA",
          metadata: { path: ["tareaId"], equals: tarea.id },
        },
      });

      if (!exists) {
        await prisma.notification.create({
          data: {
            userId,
            tipo: "TAREA_VENCIDA",
            titulo: "Tarea vencida",
            mensaje: `"${tarea.titulo}" superó su fecha límite.`,
            metadata: { tareaId: tarea.id, actionUrl: "/dashboard/tareas" },
          },
        });
        created++;
      }
    }
  }

  return created;
}

export async function generateAllNotifications(
  scope?: { organizationId: string; areaId?: string | null }
): Promise<number> {
  const where: { activo?: boolean; organizationId?: string; areaId?: string } = {
    activo: true,
  };
  if (scope?.organizationId) {
    where.organizationId = scope.organizationId;
  }
  if (scope?.areaId) {
    where.areaId = scope.areaId;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });
  let total = 0;
  for (const user of users) {
    total += await generateNotificationsForUser(user.id);
  }
  return total;
}
