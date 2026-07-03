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
