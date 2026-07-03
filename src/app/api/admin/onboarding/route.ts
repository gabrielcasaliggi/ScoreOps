import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { orgId } from "@/lib/tenant";

export interface OnboardingStep {
  id: string;
  titulo: string;
  descripcion: string;
  completado: boolean;
  href: string;
}

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const organizationId = orgId(user);

    const [areas, empleados, objetivos, tareas, org] = await Promise.all([
      prisma.area.count({ where: { organizationId } }),
      prisma.user.count({
        where: { organizationId, role: "EMPLEADO", activo: true },
      }),
      prisma.objetivo.count({
        where: { user: { organizationId } },
      }),
      prisma.tarea.count({
        where: { user: { organizationId } },
      }),
      prisma.organization.findUnique({ where: { id: organizationId } }),
    ]);

    const brandingListo = Boolean(org?.logoUrl || org?.primaryColor);

    const pasos: OnboardingStep[] = [
      {
        id: "areas",
        titulo: "Configurar áreas",
        descripcion: "Al menos un sector o departamento de la cooperativa.",
        completado: areas >= 1,
        href: "/dashboard/empleados",
      },
      {
        id: "empleados",
        titulo: "Cargar empleados",
        descripcion: "Equipo activo con roles asignados.",
        completado: empleados >= 1,
        href: "/dashboard/empleados",
      },
      {
        id: "objetivos",
        titulo: "Definir objetivos y KPIs",
        descripcion: "Metas medibles para el semestre.",
        completado: objetivos >= 1,
        href: "/dashboard/objetivos",
      },
      {
        id: "tareas",
        titulo: "Asignar tareas",
        descripcion: "Trabajo operativo vinculado al equipo.",
        completado: tareas >= 1,
        href: "/dashboard/tareas",
      },
      {
        id: "branding",
        titulo: "Personalizar marca",
        descripcion: "Logo o color de la cooperativa en el sistema.",
        completado: brandingListo,
        href: "/dashboard/configuracion",
      },
      {
        id: "premio",
        titulo: "Elegir plantilla de premio",
        descripcion: "Motor de reglas según tu reglamento.",
        completado: true,
        href: "/dashboard/configuracion",
      },
    ];

    const completados = pasos.filter((p) => p.completado).length;

    return apiSuccess({
      pasos,
      progreso: Math.round((completados / pasos.length) * 100),
      completados,
      total: pasos.length,
      listo: completados === pasos.length,
    });
  } catch (err) {
    console.error("[Onboarding]", err);
    return apiError("Error al cargar onboarding", 500);
  }
}
