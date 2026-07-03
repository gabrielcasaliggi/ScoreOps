import { apiError, requireAuth } from "@/lib/api";
import { orgId } from "@/lib/tenant";
import { buildExecutiveReport } from "@/lib/executive-stats";
import { buildExecutivePdfReport } from "@/lib/export";

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const report = await buildExecutiveReport(orgId(user));
    const buffer = buildExecutivePdfReport(report);
    const fecha = new Date().toISOString().split("T")[0];
    const slug = report.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe-ejecutivo-${slug}-${fecha}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[Export Ejecutivo]", err);
    return apiError("Error al generar informe ejecutivo", 500);
  }
}
