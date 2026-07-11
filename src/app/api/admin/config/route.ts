import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import {
  getArt49Config,
  getKpiSimpleConfig,
  getPremioTemplate,
  setArt49Config,
  setKpiSimpleConfig,
  setPremioTemplate,
} from "@/lib/system-config";
import { PREMIO_TEMPLATES, type PremioTemplateId } from "@/lib/premio-templates";
import { getWorkflowConfig, setWorkflowConfig } from "@/lib/workflow-config";

const art49ConfigSchema = z.object({
  antiguedadMinimaMeses: z.number().int().min(1).max(24).optional(),
  tramoA: z.number().min(0).max(50).optional(),
  tramoB: z.number().min(0).max(50).optional(),
  tramoC: z.number().min(0).max(50).optional(),
  tramoD: z.number().min(0).max(50).optional(),
  tramoE: z.number().min(0).max(50).optional(),
  impuntualidadMaxMinutos: z.number().int().min(1).max(30).optional(),
  impuntualidadMaxCantidad: z.number().int().min(0).max(20).optional(),
  metaReparaciones: z.number().min(0).max(100).optional(),
  metaPulsos: z.number().min(0).max(200).optional(),
  metaCobranzas: z.number().min(0).max(100).optional(),
});

const kpiSimpleSchema = z.object({
  umbralMinimo: z.number().min(0).max(100).optional(),
  porcentajeMaximo: z.number().min(0).max(50).optional(),
});

const templateSchema = z.enum(["art49_cooperativo", "kpi_simple", "solo_metricas"]);

const workflowSchema = z.object({
  tareaRequiereAprobacion: z.boolean().optional(),
  kpiAjusteRequiereAprobacion: z.boolean().optional(),
});

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const [art49, premioTemplate, kpiSimple, workflow] = await Promise.all([
    getArt49Config(user.organizationId),
    getPremioTemplate(user.organizationId),
    getKpiSimpleConfig(user.organizationId),
    getWorkflowConfig(user.organizationId),
  ]);

  return apiSuccess({
    art49,
    premioTemplate,
    kpiSimple,
    workflow,
    plantillas: PREMIO_TEMPLATES,
  });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();

    if (body.premioTemplate !== undefined) {
      const parsed = templateSchema.safeParse(body.premioTemplate);
      if (!parsed.success) return apiError("Plantilla de premio inválida");
      await setPremioTemplate(user.organizationId, parsed.data as PremioTemplateId, user.id);
    }

    if (body.kpiSimple !== undefined) {
      const parsed = kpiSimpleSchema.safeParse(body.kpiSimple);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Parámetros KPI inválidos");
      }
      await setKpiSimpleConfig(user.organizationId, parsed.data, user.id);
    }

    if (body.art49 !== undefined) {
      const parsed = art49ConfigSchema.safeParse(body.art49);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Parámetros Art. 49 inválidos");
      }
      await setArt49Config(user.organizationId, parsed.data, user.id);
    }

    if (body.workflow !== undefined) {
      const parsed = workflowSchema.safeParse(body.workflow);
      if (!parsed.success) {
        return apiError(parsed.error.issues[0]?.message ?? "Parámetros workflow inválidos");
      }
      await setWorkflowConfig(user.organizationId, parsed.data, user.id);
    }

    const [art49, premioTemplate, kpiSimple, workflow] = await Promise.all([
      getArt49Config(user.organizationId),
      getPremioTemplate(user.organizationId),
      getKpiSimpleConfig(user.organizationId),
      getWorkflowConfig(user.organizationId),
    ]);

    return apiSuccess({ art49, premioTemplate, kpiSimple, workflow, plantillas: PREMIO_TEMPLATES });
  } catch (err) {
    console.error("[Admin Config]", err);
    return apiError("Error al actualizar configuración", 500);
  }
}
