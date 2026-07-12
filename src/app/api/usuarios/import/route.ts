import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { parseCsvContent, rowToRecord } from "@/lib/csv-utils";
import { areaInOrg, orgId, userByOrgEmail } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const content = body.csv as string | undefined;
    if (!content?.trim()) {
      return apiError("Se requiere el contenido CSV en el campo 'csv'");
    }

    const { headers, rows } = parseCsvContent(content);
    const required = ["email", "nombre", "apellido", "area"];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      return apiError(`Columnas faltantes: ${missing.join(", ")}`);
    }

    const areas = await prisma.area.findMany({ where: areaInOrg(orgId(user)) });
    const areaByName = new Map(areas.map((a) => [a.nombre.toLowerCase(), a.id]));

    const errores: { fila: number; motivo: string }[] = [];
    let filasOk = 0;

    const batch = await prisma.importBatch.create({
      data: {
        tipo: "EMPLEADOS",
        archivo: body.archivo ?? "import.csv",
        filasTotal: rows.length,
        filasOk: 0,
        filasError: 0,
        subidoPorId: user.id,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const fila = i + 2;
      const record = rowToRecord(headers, rows[i]);

      try {
        const areaId = areaByName.get(record.area.toLowerCase().trim());
        if (!areaId) {
          const validas = areas.map((a) => a.nombre).join(", ") || "(ninguna)";
          errores.push({
            fila,
            motivo: `Área desconocida: "${record.area}". Áreas válidas: ${validas}`,
          });
          continue;
        }

        const role = (record.role?.toUpperCase() || "EMPLEADO") as Role;
        if (!["ADMINISTRADOR", "GERENTE", "EMPLEADO"].includes(role)) {
          errores.push({ fila, motivo: `Rol inválido: ${record.role}` });
          continue;
        }

        const email = record.email.toLowerCase();
        const existing = await prisma.user.findUnique({
          where: userByOrgEmail(orgId(user), email),
          select: { id: true },
        });

        if (!existing && !record.password?.trim()) {
          errores.push({ fila, motivo: "Contraseña requerida para usuarios nuevos" });
          continue;
        }

        const passwordHash = record.password?.trim()
          ? await bcrypt.hash(record.password, 10)
          : undefined;

        await prisma.user.upsert({
          where: userByOrgEmail(orgId(user), email),
          create: {
            organizationId: orgId(user),
            email,
            nombre: record.nombre,
            apellido: record.apellido,
            legajo: record.legajo || null,
            role,
            areaId,
            password: passwordHash!,
            activo: true,
          },
          update: {
            nombre: record.nombre,
            apellido: record.apellido,
            legajo: record.legajo || null,
            role,
            areaId,
            activo: true,
            fechaBaja: null,
            ...(passwordHash ? { password: passwordHash } : {}),
          },
        });
        filasOk++;
      } catch {
        errores.push({ fila, motivo: "Error al guardar (email o legajo duplicado)" });
      }
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        filasOk,
        filasError: errores.length,
        errores: errores.length > 0 ? errores : undefined,
      },
    });

    return apiSuccess({
      batchId: batch.id,
      filasTotal: rows.length,
      filasOk,
      filasError: errores.length,
      errores,
    });
  } catch (err) {
    console.error("[Usuarios Import]", err);
    return apiError("Error al importar CSV", 500);
  }
}
