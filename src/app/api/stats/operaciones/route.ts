import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { calculateKpiCompliance } from "@/lib/productivity";
import { getSemesterPeriod } from "@/lib/productivity-period";
import { aggregateLatenciesForPeriod } from "@/lib/task-latency";

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const empleadoWhere =
      user.role === "GERENTE"
        ? { role: "EMPLEADO" as const, activo: true, areaId: user.areaId, organizationId: user.organizationId }
        : { role: "EMPLEADO" as const, activo: true, organizationId: user.organizationId };

    const tareaScope =
      user.role === "GERENTE"
        ? { user: { areaId: user.areaId, organizationId: user.organizationId } }
        : { user: { organizationId: user.organizationId } };

    const objetivoScope =
      user.role === "GERENTE"
        ? { user: { areaId: user.areaId, organizationId: user.organizationId } }
        : { user: { organizationId: user.organizationId } };

    const [tareas, objetivos, empleados, areas, solicitudesPendientes] = await Promise.all([
      prisma.tarea.findMany({
        where: tareaScope,
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              area: { select: { nombre: true } },
            },
          },
          objetivo: { select: { id: true, titulo: true } },
        },
        orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }],
      }),
      prisma.objetivo.findMany({
        where: {
          ...objetivoScope,
          fechaFin: { gte: now },
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              area: { select: { id: true, nombre: true } },
            },
          },
          kpis: true,
        },
        orderBy: { fechaFin: "asc" },
      }),
      prisma.user.findMany({
        where: empleadoWhere,
        select: {
          id: true,
          nombre: true,
          apellido: true,
          area: { select: { id: true, nombre: true } },
        },
        orderBy: { apellido: "asc" },
      }),
      user.role === "ADMINISTRADOR"
        ? prisma.area.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { nombre: "asc" },
          })
        : Promise.resolve([]),
      prisma.workflowRequest.count({
        where: {
          organizationId: user.organizationId,
          estado: "PENDIENTE",
          ...(user.role === "GERENTE"
            ? { solicitante: { areaId: user.areaId } }
            : {}),
        },
      }),
    ]);

    const tareasAbiertas = tareas.filter((t) => t.estado !== "COMPLETADA");
    const tareasVencidas = tareasAbiertas.filter(
      (t) => t.fechaLimite && t.fechaLimite < now
    );

    const objetivosConKpi = objetivos.map((o) => {
      const kpis = o.kpis.map(calculateKpiCompliance);
      const kpiPromedio =
        kpis.length > 0
          ? Math.round(
              (kpis.reduce((s, k) => s + k.cumplimiento, 0) / kpis.length) * 10
            ) / 10
          : 0;
      return { ...o, kpis, kpiPromedio };
    });

    const objetivosRiesgo = objetivosConKpi
      .filter((o) => o.kpiPromedio < 70 || o.fechaFin <= soon)
      .slice(0, 8);

    const tareasUrgentes = [...tareasVencidas, ...tareasAbiertas.filter((t) => t.prioridad === 1)]
      .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
      .slice(0, 10);

    const period = getSemesterPeriod();
    const latencias = aggregateLatenciesForPeriod(tareas, period);

    const porPersona = empleados.map((e) => {
      const tareasPersona = tareas.filter((t) => t.userId === e.id);
      const abiertas = tareasPersona.filter((t) => t.estado !== "COMPLETADA");
      const objs = objetivosConKpi.filter((o) => o.userId === e.id);
      const kpiPromedio =
        objs.length > 0
          ? Math.round(
              (objs.reduce((s, o) => s + o.kpiPromedio, 0) / objs.length) * 10
            ) / 10
          : 0;
      return {
        userId: e.id,
        nombre: e.nombre,
        apellido: e.apellido,
        area: e.area.nombre,
        tareasAbiertas: abiertas.length,
        tareasVencidas: abiertas.filter((t) => t.fechaLimite && t.fechaLimite < now).length,
        objetivosActivos: objs.length,
        kpiPromedio,
        latencias: aggregateLatenciesForPeriod(tareasPersona, period, { detalleLimit: 0 }),
      };
    });

    const porArea =
      user.role === "ADMINISTRADOR"
        ? areas.map((area) => {
            const personas = porPersona.filter((p) =>
              empleados.find((e) => e.id === p.userId && e.area.id === area.id)
            );
            const tareasArea = tareas.filter(
              (t) => t.user.area.nombre === area.nombre && t.estado !== "COMPLETADA"
            );
            const kpiPromedio =
              personas.length > 0
                ? Math.round(
                    (personas.reduce((s, p) => s + p.kpiPromedio, 0) / personas.length) * 10
                  ) / 10
                : 0;
            return {
              areaId: area.id,
              area: area.nombre,
              empleados: personas.length,
              tareasAbiertas: tareasArea.length,
              kpiPromedio,
            };
          })
        : undefined;

    return apiSuccess({
      alcance:
        user.role === "GERENTE"
          ? { tipo: "area" as const, areaNombre: user.areaNombre }
          : { tipo: "global" as const },
      resumen: {
        tareasPendientes: tareas.filter((t) => t.estado === "PENDIENTE").length,
        tareasEnProceso: tareas.filter((t) => t.estado === "EN_PROCESO").length,
        tareasPorAprobar: tareas.filter((t) => t.estado === "PENDIENTE_APROBACION").length,
        tareasCompletadas: tareas.filter((t) => t.estado === "COMPLETADA").length,
        tareasVencidas: tareasVencidas.length,
        solicitudesPendientes,
        objetivosActivos: objetivos.length,
        objetivosEnRiesgo: objetivosRiesgo.length,
        kpiPromedioEquipo:
          porPersona.length > 0
            ? Math.round(
                (porPersona.reduce((s, p) => s + p.kpiPromedio, 0) / porPersona.length) * 10
              ) / 10
            : 0,
      },
      tareasUrgentes: tareasUrgentes.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        estado: t.estado,
        prioridad: t.prioridad,
        fechaLimite: t.fechaLimite,
        userId: t.userId,
        user: t.user,
        objetivo: t.objetivo,
        vencida: !!(t.fechaLimite && t.fechaLimite < now),
      })),
      objetivosRiesgo: objetivosRiesgo.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        fechaFin: o.fechaFin,
        kpiPromedio: o.kpiPromedio,
        user: o.user,
        proximoVencer: o.fechaFin <= soon,
      })),
      latencias,
      porPersona: porPersona.sort((a, b) => b.tareasAbiertas - a.tareasAbiertas),
      porArea,
      actualizadoEn: now.toISOString(),
    });
  } catch (err) {
    console.error("[Stats Operaciones]", err);
    return apiError("Error al cargar operaciones", 500);
  }
}
