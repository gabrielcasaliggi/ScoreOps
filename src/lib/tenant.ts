import type { Prisma } from "@prisma/client";
import type { SessionUser } from "./auth";
import { prisma } from "./prisma";

export const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG ?? "demo";

export function orgId(user: Pick<SessionUser, "organizationId">): string {
  return user.organizationId;
}

export function userByOrgEmail(
  organizationId: string,
  email: string
): Prisma.UserWhereUniqueInput {
  return {
    organizationId_email: {
      organizationId,
      email: email.toLowerCase(),
    },
  };
}

export async function resolveDefaultOrganizationId(): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
    select: { id: true },
  });
  if (!org) {
    throw new Error(`Organización default no encontrada: ${DEFAULT_ORG_SLUG}`);
  }
  return org.id;
}

export function userInOrg(organizationId: string): Prisma.UserWhereInput {
  return { organizationId };
}

export function areaInOrg(organizationId: string): Prisma.AreaWhereInput {
  return { organizationId };
}

export function tareaInOrg(organizationId: string): Prisma.TareaWhereInput {
  return { user: { organizationId } };
}

export function objetivoInOrg(organizationId: string): Prisma.ObjetivoWhereInput {
  return { user: { organizationId } };
}

export function cicloInOrg(organizationId: string): Prisma.Evaluacion360CicloWhereInput {
  return { organizationId };
}

export function assertSameOrg(
  user: Pick<SessionUser, "organizationId">,
  resourceOrgId: string
): boolean {
  return user.organizationId === resourceOrgId;
}

/** Busca un usuario de la misma organización (previene IDOR cross-tenant). */
export async function findUserInOrg(organizationId: string, userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true, areaId: true, organizationId: true },
  });
}

export async function findAreaInOrg(organizationId: string, areaId: string) {
  return prisma.area.findFirst({
    where: { id: areaId, organizationId },
    select: { id: true, nombre: true, organizationId: true },
  });
}

export async function findTareaInOrg(organizationId: string, tareaId: string) {
  return prisma.tarea.findFirst({
    where: { id: tareaId, user: { organizationId } },
  });
}

export async function findObjetivoInOrg(organizationId: string, objetivoId: string) {
  return prisma.objetivo.findFirst({
    where: { id: objetivoId, user: { organizationId } },
    include: {
      user: { select: { id: true, nombre: true, apellido: true, organizationId: true } },
      kpis: true,
      tareas: { select: { id: true, titulo: true, estado: true } },
    },
  });
}

export async function isPremioHabilitado(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { premioHabilitado: true },
  });
  return org?.premioHabilitado ?? true;
}
