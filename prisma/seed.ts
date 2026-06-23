import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { seedSystemConfig } from "../src/lib/system-config";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos...");

  await seedSystemConfig();

  const areas = await Promise.all([
    prisma.area.upsert({
      where: { nombre: "Administración" },
      update: {},
      create: { nombre: "Administración" },
    }),
    prisma.area.upsert({
      where: { nombre: "Operaciones" },
      update: {},
      create: { nombre: "Operaciones" },
    }),
    prisma.area.upsert({
      where: { nombre: "Atención al Cliente" },
      update: {},
      create: { nombre: "Atención al Cliente" },
    }),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vertia.local" },
    update: { legajo: "0001" },
    create: {
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
    where: { email: "gerente@vertia.local" },
    update: { legajo: "0002" },
    create: {
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
    where: { email: "empleado@vertia.local" },
    update: { legajo: "1001" },
    create: {
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
    where: { email: "pedro@vertia.local" },
    update: { legajo: "1002" },
    create: {
      email: "pedro@vertia.local",
      password: passwordHash,
      nombre: "Pedro",
      apellido: "Sánchez",
      role: "EMPLEADO",
      legajo: "1002",
      areaId: areas[1].id,
    },
  });

  const objetivo1 = await prisma.objetivo.create({
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

  const objetivo2 = await prisma.objetivo.create({
    data: {
      titulo: "Mejora de facturación mensual",
      fechaInicio: new Date("2026-04-01"),
      fechaFin: new Date("2026-06-30"),
      userId: empleado2.id,
      kpis: {
        create: [
          { nombre: "Facturas emitidas", valorMeta: 50, valorActual: 38, unidad: "Facturas" },
        ],
      },
    },
  });

  await prisma.tarea.createMany({
    data: [
      {
        titulo: "Revisar expedientes pendientes",
        estado: "EN_PROCESO",
        tiempoEstimado: 120,
        prioridad: 1,
        userId: empleado1.id,
        objetivoId: objetivo1.id,
      },
      {
        titulo: "Actualizar base de datos de clientes",
        estado: "PENDIENTE",
        tiempoEstimado: 90,
        prioridad: 2,
        userId: empleado1.id,
        objetivoId: objetivo1.id,
      },
      {
        titulo: "Emitir facturas del mes",
        estado: "COMPLETADA",
        tiempoEstimado: 180,
        tiempoReal: 165,
        prioridad: 1,
        userId: empleado2.id,
        objetivoId: objetivo2.id,
        completedAt: new Date(),
      },
      {
        titulo: "Conciliación bancaria",
        estado: "COMPLETADA",
        tiempoEstimado: 60,
        tiempoReal: 75,
        prioridad: 2,
        userId: empleado2.id,
        completedAt: new Date(),
      },
      {
        titulo: "Informe semanal de productividad",
        estado: "PENDIENTE",
        tiempoEstimado: 45,
        prioridad: 3,
        userId: empleado1.id,
      },
    ],
  });

  console.log("Seed completado:");
  console.log(`  Admin: ${admin.email}`);
  console.log(`  Gerente: ${gerente.email}`);
  console.log(`  Empleados: ${empleado1.email}, ${empleado2.email}`);
  console.log("  Contraseña para todos: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
