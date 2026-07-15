import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedSystemConfig } from "../src/lib/system-config";

const prisma = new PrismaClient();

const ORG_SLUG = "demo";
const ORG_NAME = "Cooperativa Demo";

async function main() {
  console.log("Iniciando seed de datos...");

  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: { name: ORG_NAME },
    create: {
      slug: ORG_SLUG,
      name: ORG_NAME,
      tagline: "Puntajes, tareas y premio a la productividad",
      primaryColor: "#0f766e",
    },
  });

  await seedSystemConfig(org.id);

  const areas = await Promise.all(
    ["Administración", "Operaciones", "Atención al Cliente"].map((nombre) =>
      prisma.area.upsert({
        where: { organizationId_nombre: { organizationId: org.id, nombre } },
        update: {},
        create: { organizationId: org.id, nombre },
      })
    )
  );

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "admin@vertia.local" } },
    update: { legajo: "0001" },
    create: {
      organizationId: org.id,
      email: "admin@vertia.local",
      password: passwordHash,
      nombre: "Ana",
      apellido: "García",
      role: "ADMINISTRADOR",
      legajo: "0001",
      areaId: areas[0].id,
    },
  });

  const gerente = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "gerente@vertia.local" } },
    update: { legajo: "0002" },
    create: {
      organizationId: org.id,
      email: "gerente@vertia.local",
      password: passwordHash,
      nombre: "Carlos",
      apellido: "Ruiz",
      role: "GERENTE",
      legajo: "0002",
      areaId: areas[1].id,
    },
  });

  const empleado1 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "empleado@vertia.local" } },
    update: { legajo: "1001" },
    create: {
      organizationId: org.id,
      email: "empleado@vertia.local",
      password: passwordHash,
      nombre: "María",
      apellido: "López",
      role: "EMPLEADO",
      legajo: "1001",
      areaId: areas[2].id,
    },
  });

  const empleado2 = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "pedro@vertia.local" } },
    update: { legajo: "1002" },
    create: {
      organizationId: org.id,
      email: "pedro@vertia.local",
      password: passwordHash,
      nombre: "Pedro",
      apellido: "Sánchez",
      role: "EMPLEADO",
      legajo: "1002",
      areaId: areas[1].id,
    },
  });

  const existingObjetivos = await prisma.objetivo.count({ where: { userId: empleado1.id } });
  if (existingObjetivos === 0) {
    await prisma.objetivo.create({
      data: {
        titulo: "Optimizar trámites administrativos Q2",
        descripcion: "Reducir tiempos de gestión documental",
        fechaInicio: new Date("2026-04-01"),
        fechaFin: new Date("2026-06-30"),
        userId: empleado1.id,
        kpis: {
          create: [
            { nombre: "Trámites procesados", valorMeta: 100, valorActual: 72, unidad: "Trámites" },
            { nombre: "Tiempo medio de respuesta", valorMeta: 24, valorActual: 18, unidad: "Horas" },
          ],
        },
      },
    });

    await prisma.objetivo.create({
      data: {
        titulo: "Mejora de facturación mensual",
        fechaInicio: new Date("2026-04-01"),
        fechaFin: new Date("2026-06-30"),
        userId: empleado2.id,
        kpis: {
          create: [{ nombre: "Facturas emitidas", valorMeta: 50, valorActual: 38, unidad: "Facturas" }],
        },
      },
    });
  }

  const tareaCount = await prisma.tarea.count();
  if (tareaCount === 0) {
    await prisma.tarea.createMany({
      data: [
        {
          titulo: "Revisar expedientes pendientes",
          estado: "PENDIENTE",
          tiempoEstimado: 120,
          prioridad: 1,
          userId: empleado1.id,
          evaluaProductividad: true,
          pesoProductividad: 2,
        },
        {
          titulo: "Actualizar base de clientes",
          estado: "EN_PROCESO",
          tiempoEstimado: 90,
          prioridad: 2,
          userId: empleado2.id,
          startedAt: new Date(),
          evaluaProductividad: true,
          pesoProductividad: 2,
        },
      ],
    });
  }

  console.log("Seed completado.");
  console.log(`  Organización demo: ${org.name} (${org.slug})`);
  console.log(`  Admin demo: admin@vertia.local / password123 (login sin slug o orgSlug=demo)`);
  console.log(`  Gerente: gerente@vertia.local / empleado@vertia.local`);

  // Org interna Vertia — solo operaciones de plataforma (no usar en demos comerciales)
  const vertiaOrg = await prisma.organization.upsert({
    where: { slug: "vertia" },
    update: { name: "Vertia Operaciones" },
    create: {
      slug: "vertia",
      name: "Vertia Operaciones",
      tagline: "Administración de la plataforma ScoreOps",
      primaryColor: "#1e293b",
    },
  });

  await seedSystemConfig(vertiaOrg.id);

  const vertiaArea = await prisma.area.upsert({
    where: { organizationId_nombre: { organizationId: vertiaOrg.id, nombre: "Plataforma" } },
    update: {},
    create: { organizationId: vertiaOrg.id, nombre: "Plataforma" },
  });

  await prisma.user.upsert({
    where: {
      organizationId_email: { organizationId: vertiaOrg.id, email: "soporte@vertia.local" },
    },
    update: { legajo: "V001" },
    create: {
      organizationId: vertiaOrg.id,
      email: "soporte@vertia.local",
      password: passwordHash,
      nombre: "Soporte",
      apellido: "Vertia",
      role: "ADMINISTRADOR",
      legajo: "V001",
      areaId: vertiaArea.id,
    },
  });

  console.log(`  Super-admin: soporte@vertia.local / password123 (login orgSlug=vertia)`);
  console.log(`  Configurá VERTIA_SUPER_ADMIN_EMAILS=soporte@vertia.local en .env`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
