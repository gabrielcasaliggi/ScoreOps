import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireSuperAdmin } from "@/lib/api";
import { seedSystemConfig } from "@/lib/system-config";

const createOrgSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  areaNombre: z.string().min(1).max(80).default("General"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminNombre: z.string().min(1),
  adminApellido: z.string().min(1),
  premioHabilitado: z.boolean().default(true),
});

export async function GET() {
  const { error, user } = await requireSuperAdmin();
  if (error || !user) return error;

  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, areas: true } },
      },
    });

    return apiSuccess({
      organizations: orgs.map((o) => ({
        id: o.id,
        slug: o.slug,
        name: o.name,
        tagline: o.tagline,
        primaryColor: o.primaryColor,
        activo: o.activo,
        premioHabilitado: o.premioHabilitado,
        usuarios: o._count.users,
        areas: o._count.areas,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    console.error("[SuperAdmin Orgs]", err);
    return apiError("Error al listar organizaciones", 500);
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireSuperAdmin();
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const data = parsed.data;
    const existing = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) return apiError("El slug ya está en uso");

    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          slug: data.slug,
          name: data.name,
          tagline:
            data.tagline ??
            (data.premioHabilitado
              ? "Puntajes, tareas y premio a la productividad"
              : "Gestión de tareas, objetivos y KPIs"),
          primaryColor: data.primaryColor ?? "#5b4ae0",
          premioHabilitado: data.premioHabilitado,
        },
      });

      const area = await tx.area.create({
        data: { organizationId: created.id, nombre: data.areaNombre },
      });

      await tx.user.create({
        data: {
          organizationId: created.id,
          email: data.adminEmail.toLowerCase(),
          password: passwordHash,
          nombre: data.adminNombre,
          apellido: data.adminApellido,
          role: "ADMINISTRADOR",
          areaId: area.id,
          legajo: "0001",
        },
      });

      return created;
    });

    await seedSystemConfig(org.id);

    return apiSuccess(
      {
        organization: {
          id: org.id,
          slug: org.slug,
          name: org.name,
        },
        loginHint: `Login con orgSlug "${org.slug}" y ${data.adminEmail}`,
      },
      201
    );
  } catch (err) {
    console.error("[SuperAdmin Create Org]", err);
    return apiError("Error al crear organización", 500);
  }
}
