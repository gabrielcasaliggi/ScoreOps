#!/usr/bin/env npx tsx
/**
 * Migra una instalación existente al modelo multi-tenant.
 * Uso: npx tsx scripts/migrate-tenant.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_SLUG = process.env.DEFAULT_ORG_SLUG ?? "demo";
const DEFAULT_NAME = process.env.DEFAULT_ORG_NAME ?? "Cooperativa Demo";

async function main() {
  console.log("Migrando a multi-tenant...");

  let org = await prisma.organization.findUnique({ where: { slug: DEFAULT_SLUG } });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        slug: DEFAULT_SLUG,
        name: DEFAULT_NAME,
        tagline: "Puntajes, tareas y premio a la productividad",
        primaryColor: "#5b4ae0",
      },
    });
    console.log(`Organización creada: ${org.name} (${org.slug})`);
  } else {
    console.log(`Organización existente: ${org.name}`);
  }

  const orgId = org.id;

  await prisma.$executeRawUnsafe(
    `UPDATE "Area" SET "organizationId" = $1 WHERE "organizationId" IS NULL`,
    orgId
  ).catch(() => {
    /* columna puede no existir aún si se usa db push */
  });

  const areas = await prisma.area.findMany({ where: { organizationId: orgId } });
  if (areas.length === 0) {
    console.log("Ejecutá npm run db:push y luego el seed.");
    return;
  }

  const updatedUsers = await prisma.user.updateMany({
    where: { organizationId: { not: orgId } },
    data: { organizationId: orgId },
  });
  console.log(`Usuarios vinculados: ${updatedUsers.count}`);

  const configs = await prisma.systemConfig.findMany();
  for (const cfg of configs) {
    if (cfg.organizationId !== orgId) {
      await prisma.systemConfig.update({
        where: { id: cfg.id },
        data: { organizationId: orgId },
      });
    }
  }

  await prisma.metaColectivaSemestre.updateMany({
    where: { organizationId: { not: orgId } },
    data: { organizationId: orgId },
  });

  await prisma.evaluacion360Ciclo.updateMany({
    where: { organizationId: { not: orgId } },
    data: { organizationId: orgId },
  });

  console.log("Migración completada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
