import { prisma } from "./prisma";
import { calculateKpiCompliance } from "./productivity";

export async function captureKpiSnapshot(
  kpiId: string,
  organizationId: string,
  userId: string,
  periodoId: string
): Promise<void> {
  const kpi = await prisma.kPI.findUnique({ where: { id: kpiId } });
  if (!kpi) return;

  const compliance = calculateKpiCompliance(kpi);

  await prisma.kpiSnapshot.create({
    data: {
      organizationId,
      kpiId,
      userId,
      periodoId,
      valorActual: kpi.valorActual,
      valorMeta: kpi.valorMeta,
      cumplimiento: compliance.cumplimiento,
    },
  });
}
