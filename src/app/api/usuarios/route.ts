import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { createUserSchema } from "@/lib/user-validation";

const userSelect = {
  id: true,
  email: true,
  nombre: true,
  apellido: true,
  legajo: true,
  telefono: true,
  sueldoBasico: true,
  valorAntiguedad: true,
  role: true,
  activo: true,
  fechaAlta: true,
  fechaBaja: true,
  area: { select: { id: true, nombre: true } },
} satisfies Prisma.UserSelect;

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const activoParam = searchParams.get("activo");
  const areaId = searchParams.get("areaId");
  const q = searchParams.get("q")?.trim();

  const where: Prisma.UserWhereInput = { organizationId: user.organizationId };

  if (user.role === "GERENTE") {
    where.areaId = user.areaId;
    where.role = "EMPLEADO";
  } else if (user.role === "ADMINISTRADOR") {
    const role = searchParams.get("role") as Role | null;
    if (role) where.role = role;
    if (areaId) where.areaId = areaId;
  }

  if (activoParam === "true") where.activo = true;
  else if (activoParam === "false") where.activo = false;
  else if (user.role === "ADMINISTRADOR" && activoParam !== "all") {
    where.activo = true;
  } else if (user.role === "GERENTE") {
    where.activo = true;
  }

  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { apellido: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { legajo: { contains: q, mode: "insensitive" } },
    ];
  }

  const usuarios = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: [{ activo: "desc" }, { apellido: "asc" }],
  });

  return apiSuccess(usuarios);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const data = parsed.data;
    const passwordHash = await bcrypt.hash(data.password, 10);

    const area = await prisma.area.findUnique({ where: { id: data.areaId } });
    if (!area || area.organizationId !== user.organizationId) {
      return apiError("Área no encontrada", 404);
    }

    const created = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        email: data.email.toLowerCase(),
        nombre: data.nombre,
        apellido: data.apellido,
        legajo: data.legajo,
        telefono: data.telefono,
        role: data.role,
        areaId: data.areaId,
        password: passwordHash,
      },
      select: userSelect,
    });

    return apiSuccess(created, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return apiError("Email o legajo ya registrado");
    }
    console.error("[Usuarios POST]", err);
    return apiError("Error al crear usuario", 500);
  }
}
