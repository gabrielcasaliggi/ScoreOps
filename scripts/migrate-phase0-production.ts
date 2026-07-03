#!/usr/bin/env npx tsx
/**
 * Migra una BD existente (pre Fase 0) al schema multi-tenant SIN perder datos.
 * Ejecutar ANTES de `npm run db:push` cuando db:push falla por filas existentes.
 *
 * Uso: npm run db:migrate-phase0
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_SLUG = process.env.DEFAULT_ORG_SLUG ?? "demo";
const DEFAULT_NAME = process.env.DEFAULT_ORG_NAME ?? "Cooperativa Demo";

function cuidLike(): string {
  return `c${randomBytes(12).toString("hex")}`;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function constraintExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = ${name}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function main() {
  console.log("=== Migración Fase 0 (producción, sin borrar datos) ===\n");

  const orgTableExists = await tableExists("Organization");

  if (!orgTableExists) {
    await prisma.$executeRaw`
      CREATE TABLE "Organization" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "tagline" TEXT,
        "logoUrl" TEXT,
        "primaryColor" TEXT,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
      )
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug")
    `;
    console.log("Tabla Organization creada.");
  }

  let orgId: string;
  const existingOrg = await prisma.organization.findUnique({ where: { slug: DEFAULT_SLUG } });

  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`Organización existente: ${existingOrg.name} (${existingOrg.slug})`);
  } else {
    orgId = cuidLike();
    await prisma.$executeRaw`
      INSERT INTO "Organization" ("id", "slug", "name", "tagline", "primaryColor", "activo", "createdAt", "updatedAt")
      VALUES (
        ${orgId},
        ${DEFAULT_SLUG},
        ${DEFAULT_NAME},
        ${"Puntajes, tareas y premio a la productividad"},
        ${"#5b4ae0"},
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
    console.log(`Organización creada: ${DEFAULT_NAME} (${DEFAULT_SLUG})`);
  }

  // --- Area ---
  if (!(await columnExists("Area", "organizationId"))) {
    await prisma.$executeRaw`ALTER TABLE "Area" ADD COLUMN "organizationId" TEXT`;
    console.log("Area: columna organizationId agregada.");
  }
  await prisma.$executeRaw`
    UPDATE "Area" SET "organizationId" = ${orgId} WHERE "organizationId" IS NULL
  `;
  await prisma.$executeRaw`
    ALTER TABLE "Area" ALTER COLUMN "organizationId" SET NOT NULL
  `;
  if (await constraintExists("Area_nombre_key")) {
    await prisma.$executeRaw`ALTER TABLE "Area" DROP CONSTRAINT "Area_nombre_key"`;
  }

  // --- User ---
  if (!(await columnExists("User", "organizationId"))) {
    await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "organizationId" TEXT`;
    console.log("User: columna organizationId agregada.");
  }
  await prisma.$executeRaw`
    UPDATE "User" SET "organizationId" = ${orgId} WHERE "organizationId" IS NULL
  `;
  await prisma.$executeRaw`
    ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL
  `;
  if (await constraintExists("User_email_key")) {
    await prisma.$executeRaw`ALTER TABLE "User" DROP CONSTRAINT "User_email_key"`;
  }

  // --- MetaColectivaSemestre ---
  if (await tableExists("MetaColectivaSemestre")) {
    if (!(await columnExists("MetaColectivaSemestre", "organizationId"))) {
      await prisma.$executeRaw`
        ALTER TABLE "MetaColectivaSemestre" ADD COLUMN "organizationId" TEXT
      `;
      console.log("MetaColectivaSemestre: columna organizationId agregada.");
    }
    await prisma.$executeRaw`
      UPDATE "MetaColectivaSemestre"
      SET "organizationId" = ${orgId}
      WHERE "organizationId" IS NULL
    `;
    await prisma.$executeRaw`
      ALTER TABLE "MetaColectivaSemestre" ALTER COLUMN "organizationId" SET NOT NULL
    `;
    if (await constraintExists("MetaColectivaSemestre_periodoId_tipo_key")) {
      await prisma.$executeRaw`
        ALTER TABLE "MetaColectivaSemestre"
        DROP CONSTRAINT "MetaColectivaSemestre_periodoId_tipo_key"
      `;
    }
  }

  // --- SystemConfig (clave era PK) ---
  if (await tableExists("SystemConfig")) {
    if (!(await columnExists("SystemConfig", "id"))) {
      await prisma.$executeRaw`ALTER TABLE "SystemConfig" ADD COLUMN "id" TEXT`;
      console.log("SystemConfig: columna id agregada.");
    }
    if (!(await columnExists("SystemConfig", "organizationId"))) {
      await prisma.$executeRaw`
        ALTER TABLE "SystemConfig" ADD COLUMN "organizationId" TEXT
      `;
      console.log("SystemConfig: columna organizationId agregada.");
    }
    await prisma.$executeRaw`
      UPDATE "SystemConfig"
      SET "id" = 'c' || replace(gen_random_uuid()::text, '-', '')
      WHERE "id" IS NULL
    `;
    await prisma.$executeRaw`
      UPDATE "SystemConfig"
      SET "organizationId" = ${orgId}
      WHERE "organizationId" IS NULL
    `;
    await prisma.$executeRaw`
      ALTER TABLE "SystemConfig" ALTER COLUMN "id" SET NOT NULL
    `;
    await prisma.$executeRaw`
      ALTER TABLE "SystemConfig" ALTER COLUMN "organizationId" SET NOT NULL
    `;
    if (await constraintExists("SystemConfig_pkey")) {
      const pkOnClave = await prisma.$queryRaw<{ attname: string }[]>`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = '"SystemConfig"'::regclass
          AND i.indisprimary
      `;
      const pkCols = pkOnClave.map((r) => r.attname);
      if (pkCols.length === 1 && pkCols[0] === "clave") {
        await prisma.$executeRaw`ALTER TABLE "SystemConfig" DROP CONSTRAINT "SystemConfig_pkey"`;
        await prisma.$executeRaw`
          ALTER TABLE "SystemConfig" ADD CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
        `;
        console.log("SystemConfig: PK migrada de clave → id.");
      }
    }
  }

  // --- Evaluacion360Ciclo ---
  if (await tableExists("Evaluacion360Ciclo")) {
    if (!(await columnExists("Evaluacion360Ciclo", "organizationId"))) {
      await prisma.$executeRaw`
        ALTER TABLE "Evaluacion360Ciclo" ADD COLUMN "organizationId" TEXT
      `;
    }
    await prisma.$executeRaw`
      UPDATE "Evaluacion360Ciclo"
      SET "organizationId" = ${orgId}
      WHERE "organizationId" IS NULL
    `;
    const count = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Evaluacion360Ciclo" WHERE "organizationId" IS NOT NULL
    `;
    if (Number(count[0]?.count ?? 0) > 0) {
      await prisma.$executeRaw`
        ALTER TABLE "Evaluacion360Ciclo" ALTER COLUMN "organizationId" SET NOT NULL
      `;
    }
  }

  const areas = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Area"
  `;
  const users = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "User"
  `;

  console.log(`\nÁreas: ${areas[0]?.count ?? 0}`);
  console.log(`Usuarios: ${users[0]?.count ?? 0}`);
  console.log("\n✓ Pre-migración completada.");
  console.log("Ahora ejecutá: npm run db:push");
  console.log("Luego:         npm run db:migrate-tenant");
  console.log("Finalmente:    pm2 restart vertia-gestion --update-env");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
