import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface WorkflowConfig {
  /** Empleado debe pedir aprobación al marcar tarea completada */
  tareaRequiereAprobacion: boolean;
  /** Empleado no puede editar KPI directo; debe solicitar ajuste */
  kpiAjusteRequiereAprobacion: boolean;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  tareaRequiereAprobacion: true,
  kpiAjusteRequiereAprobacion: true,
};

const CONFIG_KEY = "workflow.config";

function configWhere(organizationId: string) {
  return { organizationId_clave: { organizationId, clave: CONFIG_KEY } };
}

export async function getWorkflowConfig(organizationId: string): Promise<WorkflowConfig> {
  const row = await prisma.systemConfig.findUnique({
    where: configWhere(organizationId),
  });
  if (!row) return DEFAULT_WORKFLOW_CONFIG;
  return { ...DEFAULT_WORKFLOW_CONFIG, ...(row.valor as unknown as WorkflowConfig) };
}

export async function setWorkflowConfig(
  organizationId: string,
  config: Partial<WorkflowConfig>,
  updatedById?: string
): Promise<WorkflowConfig> {
  const current = await getWorkflowConfig(organizationId);
  const merged = { ...current, ...config };
  const valor: Prisma.InputJsonValue = JSON.parse(JSON.stringify(merged));

  await prisma.systemConfig.upsert({
    where: configWhere(organizationId),
    create: {
      organizationId,
      clave: CONFIG_KEY,
      valor,
      descripcion: "Workflows de aprobación (tareas y KPIs)",
      updatedById,
    },
    update: { valor, updatedById },
  });

  return merged;
}
