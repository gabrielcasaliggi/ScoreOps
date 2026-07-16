import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MetaColectivaTipo'
  `;
  console.log("before", before.map((r) => r.enumlabel));

  const labels = new Set(before.map((r) => r.enumlabel));

  if (labels.has("REPARACIONES") && !labels.has("RECLAMOS")) {
    await prisma.$executeRaw`
      ALTER TYPE "MetaColectivaTipo" RENAME VALUE 'REPARACIONES' TO 'RECLAMOS'
    `;
    console.log("REPARACIONES → RECLAMOS");
  }

  if (labels.has("PULSOS") && !labels.has("VENTAS")) {
    await prisma.$executeRaw`
      ALTER TYPE "MetaColectivaTipo" RENAME VALUE 'PULSOS' TO 'VENTAS'
    `;
    console.log("PULSOS → VENTAS");
  }

  const after = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'MetaColectivaTipo'
  `;
  console.log("after", after.map((r) => r.enumlabel));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
