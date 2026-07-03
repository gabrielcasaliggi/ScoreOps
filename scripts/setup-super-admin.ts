#!/usr/bin/env npx tsx
/**
 * Crea la org interna Vertia y el usuario soporte@vertia.local (super-admin).
 * No modifica Cooperativa Demo ni sus datos de demo.
 *
 * Uso: npm run db:setup-super-admin
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedSystemConfig } from "../src/lib/system-config";

const prisma = new PrismaClient();

const SOPORTE_EMAIL = "soporte@vertia.local";
const DEFAULT_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "password123";

async function main() {
  console.log("Configurando super-admin Vertia...\n");

  const vertiaOrg = await prisma.organization.upsert({
    where: { slug: "vertia" },
    update: { name: "Vertia Operaciones", activo: true },
    create: {
      slug: "vertia",
      name: "Vertia Operaciones",
      tagline: "Administración de la plataforma ScoreOps",
      primaryColor: "#1e293b",
    },
  });

  await seedSystemConfig(vertiaOrg.id);

  const area = await prisma.area.upsert({
    where: { organizationId_nombre: { organizationId: vertiaOrg.id, nombre: "Plataforma" } },
    update: {},
    create: { organizationId: vertiaOrg.id, nombre: "Plataforma" },
  });

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await prisma.user.upsert({
    where: {
      organizationId_email: { organizationId: vertiaOrg.id, email: SOPORTE_EMAIL },
    },
    update: {},
    create: {
      organizationId: vertiaOrg.id,
      email: SOPORTE_EMAIL,
      password: passwordHash,
      nombre: "Soporte",
      apellido: "Vertia",
      role: "ADMINISTRADOR",
      legajo: "V001",
      areaId: area.id,
    },
  });

  const demoOrg = await prisma.organization.findUnique({ where: { slug: "demo" } });
  if (demoOrg) {
    const demoUsers = await prisma.user.count({ where: { organizationId: demoOrg.id } });
    console.log(`Cooperativa Demo (${demoOrg.slug}): ${demoUsers} usuarios — sin cambios.`);
  }

  console.log("\n✓ Listo.");
  console.log(`  Super-admin: ${SOPORTE_EMAIL} / ${DEFAULT_PASSWORD}`);
  console.log(`  Login: orgSlug "vertia" + email arriba`);
  console.log(`\n  En .env de producción:`);
  console.log(`  VERTIA_SUPER_ADMIN_EMAILS="${SOPORTE_EMAIL}"`);
  console.log(`  (quitá admin@vertia.local de esa variable)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
