import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireSuperAdmin } from "@/lib/api";
import { seedSystemConfig } from "@/lib/system-config";
import { ADMIN_DEFAULT_AREA, normalizeAreaNames } from "@/lib/default-areas";

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
  /** @deprecated usar areasIniciales — se mantiene por compatibilidad */
  areaNombre: z.string().min(1).max(80).optional(),
  areasIniciales: z.array(z.string().min(1).max(80)).max(20).optional(),
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

    const areaNames = normalizeAreaNames(
      data.areasIniciales?.length
        ? data.areasIniciales
        : data.areaNombre
          ? [
              data.areaNombre,
              ...normalizeAreaNames(undefined).filter(
                (n) => n.toLowerCase() !== data.areaNombre!.toLowerCase()
              ),
            ]
          : undefined
    );

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
          primaryColor: data.primaryColor ?? "#1e3a5f",
          premioHabilitado: data.premioHabilitado,
        },
      });

      const createdAreas = [];
      for (const nombre of areaNames) {
        createdAreas.push(
          await tx.area.create({
            data: { organizationId: created.id, nombre },
          })
        );
      }

      const adminArea =
        createdAreas.find(
          (a) => a.nombre.toLowerCase() === ADMIN_DEFAULT_AREA.toLowerCase()
        ) ?? createdAreas[0];

      await tx.user.create({
        data: {
          organizationId: created.id,
          email: data.adminEmail.toLowerCase(),
          password: passwordHash,
          nombre: data.adminNombre,
          apellido: data.adminApellido,
          role: "ADMINISTRADOR",
          areaId: adminArea.id,
          legajo: "0001",
        },
      });

      return { created, areaCount: createdAreas.length };
    });

    await seedSystemConfig(org.created.id);

    return apiSuccess(
      {
        organization: {
          id: org.created.id,
          slug: org.created.slug,
          name: org.created.name,
          areas: org.areaCount,
        },
        loginHint: `Login con orgSlug "${org.created.slug}" y ${data.adminEmail}. El admin puede crear más áreas en Empleados.`,
      },
      201
    );
  } catch (err) {
    console.error("[SuperAdmin Create Org]", err);
    return apiError("Error al crear organización", 500);
  }
}
