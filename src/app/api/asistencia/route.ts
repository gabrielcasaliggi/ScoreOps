import { NextRequest } from "next/server";
import { z } from "zod";
import type { AsistenciaTipo, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { parsePeriodoParam, periodoIdFromDate } from "@/lib/productivity-period";
import { parseCsvContent, rowToRecord } from "@/lib/csv-utils";
import { ASISTENCIA_TIPO_LABELS } from "@/lib/asistencia";

const createSchema = z.object({
  userId: z.string().min(1),
  fecha: z.string().min(1),
  tipo: z.string().min(1),
  minutosTarde: z.number().int().min(0).optional(),
  observacion: z.string().optional(),
});

function parseAsistenciaTipo(value: string): AsistenciaTipo | null {
  const normalized = value.toUpperCase().replace(/\s+/g, "_");
  if (normalized in ASISTENCIA_TIPO_LABELS) {
    return normalized as AsistenciaTipo;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));
  const userId = searchParams.get("userId");
  const areaId = searchParams.get("areaId");

  const where: Prisma.AsistenciaRegistroWhereInput = {
    periodoId: period.id,
  };

  if (userId) where.userId = userId;

  if (user.role === "GERENTE") {
    where.user = { areaId: user.areaId };
  } else if (areaId) {
    where.user = { areaId };
  }

  const registros = await prisma.asistenciaRegistro.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          legajo: true,
          area: { select: { nombre: true } },
        },
      },
    },
    orderBy: [{ fecha: "desc" }],
  });

  return apiSuccess({ registros, periodo: period });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const tipo = parseAsistenciaTipo(parsed.data.tipo);
    if (!tipo) return apiError("Tipo de asistencia inválido");

    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, areaId: true },
    });
    if (!target) return apiError("Usuario no encontrado", 404);

    if (user.role === "GERENTE" && target.areaId !== user.areaId) {
      return apiError("Sin permisos para este empleado", 403);
    }

    const fecha = new Date(parsed.data.fecha);
    if (Number.isNaN(fecha.getTime())) return apiError("Fecha inválida");

    const registro = await prisma.asistenciaRegistro.upsert({
      where: {
        userId_fecha: {
          userId: parsed.data.userId,
          fecha,
        },
      },
      create: {
        userId: parsed.data.userId,
        fecha,
        tipo,
        minutosTarde: parsed.data.minutosTarde,
        observacion: parsed.data.observacion,
        periodoId: periodoIdFromDate(fecha),
        creadoPorId: user.id,
      },
      update: {
        tipo,
        minutosTarde: parsed.data.minutosTarde,
        observacion: parsed.data.observacion,
        periodoId: periodoIdFromDate(fecha),
      },
      include: {
        user: {
          select: { nombre: true, apellido: true, legajo: true },
        },
      },
    });

    return apiSuccess(registro, 201);
  } catch (err) {
    console.error("[Asistencia POST]", err);
    return apiError("Error al registrar asistencia", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const content = body.csv as string | undefined;
    if (!content?.trim()) {
      return apiError("Se requiere el contenido CSV en el campo 'csv'");
    }

    const { headers, rows } = parseCsvContent(content);
    const required = ["legajo", "fecha", "tipo"];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      return apiError(`Columnas faltantes: ${missing.join(", ")}`);
    }

    const errores: { fila: number; motivo: string }[] = [];
    let filasOk = 0;

    const batch = await prisma.importBatch.create({
      data: {
        tipo: "ASISTENCIA",
        archivo: body.archivo ?? "asistencia.csv",
        filasTotal: rows.length,
        filasOk: 0,
        filasError: 0,
        subidoPorId: user.id,
      },
    });

    for (let i = 0; i < rows.length; i++) {
      const fila = i + 2;
      const record = rowToRecord(headers, rows[i]);

      const tipo = parseAsistenciaTipo(record.tipo);
      if (!tipo) {
        errores.push({ fila, motivo: `Tipo inválido: ${record.tipo}` });
        continue;
      }

      const empleado = await prisma.user.findFirst({
        where: { legajo: record.legajo, activo: true },
        select: { id: true, areaId: true },
      });
      if (!empleado) {
        errores.push({ fila, motivo: `Legajo no encontrado: ${record.legajo}` });
        continue;
      }

      if (user.role === "GERENTE" && empleado.areaId !== user.areaId) {
        errores.push({ fila, motivo: "Empleado fuera de tu área" });
        continue;
      }

      const fecha = new Date(record.fecha);
      if (Number.isNaN(fecha.getTime())) {
        errores.push({ fila, motivo: `Fecha inválida: ${record.fecha}` });
        continue;
      }

      const minutosTarde = record.minutos_tarde ? Number(record.minutos_tarde) : undefined;
      if (record.minutos_tarde && Number.isNaN(minutosTarde)) {
        errores.push({ fila, motivo: "minutos_tarde inválido" });
        continue;
      }

      try {
        await prisma.asistenciaRegistro.upsert({
          where: { userId_fecha: { userId: empleado.id, fecha } },
          create: {
            userId: empleado.id,
            fecha,
            tipo,
            minutosTarde,
            observacion: record.observacion || null,
            periodoId: periodoIdFromDate(fecha),
            importBatchId: batch.id,
            creadoPorId: user.id,
          },
          update: {
            tipo,
            minutosTarde,
            observacion: record.observacion || null,
            periodoId: periodoIdFromDate(fecha),
            importBatchId: batch.id,
          },
        });
        filasOk++;
      } catch {
        errores.push({ fila, motivo: "Error al guardar registro" });
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
    console.error("[Asistencia Import]", err);
    return apiError("Error al importar asistencia", 500);
  }
}
