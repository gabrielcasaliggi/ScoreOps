import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { getArt49Config, setArt49Config } from "@/lib/system-config";

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

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const art49 = await getArt49Config();
  return apiSuccess({ art49 });
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = art49ConfigSchema.safeParse(body.art49 ?? body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const config = await setArt49Config(parsed.data, user.id);
    return apiSuccess({ art49: config });
  } catch (err) {
    console.error("[Admin Config]", err);
    return apiError("Error al actualizar configuración", 500);
  }
}
