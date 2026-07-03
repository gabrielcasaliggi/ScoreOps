import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { areaInOrg, resolveDefaultOrganizationId, userByOrgEmail } from "@/lib/tenant";

const syncSchema = z.object({
  apiKey: z.string().min(1),
  empleados: z
    .array(
      z.object({
        externalId: z.string().min(1),
        legajo: z.string().optional(),
        email: z.string().email(),
        nombre: z.string().min(1),
        apellido: z.string().min(1),
        area: z.string().min(1),
        activo: z.boolean().optional(),
      })
    )
    .optional(),
});

/**
 * Stub de integración RRHH.
 * Requiere INTEGRATION_API_KEY en .env para autenticar llamadas externas.
 */
export async function POST(request: NextRequest) {
  const expectedKey = process.env.INTEGRATION_API_KEY;
  if (!expectedKey) {
    return apiError("Integración RRHH no configurada en el servidor", 503);
  }

  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Payload inválido");
    }

    if (parsed.data.apiKey !== expectedKey) {
      return apiError("API key inválida", 401);
    }

    if (!parsed.data.empleados?.length) {
      return apiSuccess({
        status: "ok",
        message: "Endpoint activo. Enviá empleados[] para sincronizar.",
        sincronizados: 0,
      });
    }

    const organizationId = await resolveDefaultOrganizationId();
    const areas = await prisma.area.findMany({ where: areaInOrg(organizationId) });
    const areaByName = new Map(areas.map((a) => [a.nombre.toLowerCase(), a.id]));
    let sincronizados = 0;
    const errores: string[] = [];

    for (const emp of parsed.data.empleados) {
      const areaId = areaByName.get(emp.area.toLowerCase());
      if (!areaId) {
        errores.push(`${emp.email}: área desconocida ${emp.area}`);
        continue;
      }

      const email = emp.email.toLowerCase();
      const existing = await prisma.user.findUnique({
        where: userByOrgEmail(organizationId, email),
      });
      const passwordHash = existing
        ? undefined
        : await bcrypt.hash(`rrhh-${emp.externalId}`, 10);

      await prisma.user.upsert({
        where: userByOrgEmail(organizationId, email),
        create: {
          organizationId,
          email,
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          externalId: emp.externalId,
          areaId,
          password: passwordHash!,
          activo: emp.activo ?? true,
          role: "EMPLEADO",
        },
        update: {
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          externalId: emp.externalId,
          areaId,
          activo: emp.activo ?? true,
        },
      });
      sincronizados++;
    }

    return apiSuccess({ status: "ok", sincronizados, errores });
  } catch (err) {
    console.error("[Integrations RRHH]", err);
    return apiError("Error en sincronización", 500);
  }
}

export async function GET() {
  return apiSuccess({
    status: "stub",
    message: "POST /api/integrations/rrhh/sync con apiKey y empleados[]",
    configurado: Boolean(process.env.INTEGRATION_API_KEY),
  });
}
