import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { orgId } from "@/lib/tenant";
import { buildExecutiveReport } from "@/lib/executive-stats";

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const report = await buildExecutiveReport(orgId(user));
    const { organizationName: _, ...payload } = report;
    return apiSuccess(payload);
  } catch (err) {
    console.error("[Stats Ejecutivo]", err);
    return apiError("Error al calcular dashboard ejecutivo", 500);
  }
}
