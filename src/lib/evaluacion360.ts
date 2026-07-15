import type { EvaluacionRol, Role, User } from "@prisma/client";
import { prisma } from "./prisma";
import {
  getEvaluacion360Pesos,
  type Evaluacion360Pesos,
} from "./system-config";

export const DEFAULT_COMPETENCIAS = [
  "Trabajo en equipo",
  "Comunicación",
  "Proactividad",
  "Calidad del trabajo",
  "Cumplimiento de objetivos",
] as const;

export interface EvaluacionAssignment {
  cicloId: string;
  evaluadoId: string;
  evaluadoNombre: string;
  evaluadorId: string;
  rol: EvaluacionRol;
}

type UsuarioBasico = Pick<User, "id" | "nombre" | "apellido" | "role" | "areaId" | "activo">;

export function buildAssignmentsForUser(
  evaluador: UsuarioBasico,
  empleados: UsuarioBasico[],
  gerentes: UsuarioBasico[],
  cicloId: string
): EvaluacionAssignment[] {
  const assignments: EvaluacionAssignment[] = [];
  const evaluados = empleados.filter((e) => e.activo);

  for (const evaluado of evaluados) {
    const label = `${evaluado.nombre} ${evaluado.apellido}`;

    if (evaluador.id === evaluado.id) {
      assignments.push({
        cicloId,
        evaluadoId: evaluado.id,
        evaluadoNombre: label,
        evaluadorId: evaluador.id,
        rol: "AUTOEVALUACION",
      });
      continue;
    }

    if (evaluador.role === "GERENTE" && evaluado.areaId === evaluador.areaId) {
      assignments.push({
        cicloId,
        evaluadoId: evaluado.id,
        evaluadoNombre: label,
        evaluadorId: evaluador.id,
        rol: "GERENTE",
      });
    }

    if (
      evaluador.role === "ADMINISTRADOR" &&
      evaluado.role === "EMPLEADO" &&
      !gerentes.some((g) => g.areaId === evaluado.areaId)
    ) {
      assignments.push({
        cicloId,
        evaluadoId: evaluado.id,
        evaluadoNombre: label,
        evaluadorId: evaluador.id,
        rol: "GERENTE",
      });
    }

    if (
      evaluador.role === "EMPLEADO" &&
      evaluado.role === "EMPLEADO" &&
      evaluador.areaId === evaluado.areaId &&
      evaluador.id !== evaluado.id
    ) {
      assignments.push({
        cicloId,
        evaluadoId: evaluado.id,
        evaluadoNombre: label,
        evaluadorId: evaluador.id,
        rol: "PAR",
      });
    }

    if (evaluado.role === "GERENTE") {
      const subordinados = empleados.filter(
        (e) => e.areaId === evaluado.areaId && e.role === "EMPLEADO" && e.activo
      );
      if (subordinados.some((s) => s.id === evaluador.id)) {
        assignments.push({
          cicloId,
          evaluadoId: evaluado.id,
          evaluadoNombre: label,
          evaluadorId: evaluador.id,
          rol: "SUBORDINADO",
        });
      }
    }
  }

  return assignments;
}

export async function getPendingAssignments(
  evaluadorId: string,
  cicloId: string
): Promise<EvaluacionAssignment[]> {
  const evaluador = await prisma.user.findUnique({
    where: { id: evaluadorId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      role: true,
      areaId: true,
      activo: true,
      organizationId: true,
    },
  });
  if (!evaluador) return [];

  const [usuarios, respuestas] = await Promise.all([
    prisma.user.findMany({
      where: { activo: true, organizationId: evaluador.organizationId },
      select: { id: true, nombre: true, apellido: true, role: true, areaId: true, activo: true },
    }),
    prisma.evaluacion360Respuesta.findMany({
      where: { cicloId, evaluadorId },
      select: { evaluadoId: true, rol: true, competencia: true },
    }),
  ]);

  const empleados = usuarios.filter((u) => u.role === "EMPLEADO" || u.role === "GERENTE");
  const gerentes = usuarios.filter((u) => u.role === "GERENTE" || u.role === "ADMINISTRADOR");

  const assignments = buildAssignmentsForUser(evaluador, empleados, gerentes, cicloId);

  return assignments.filter((a) => {
    const count = respuestas.filter(
      (r) => r.evaluadoId === a.evaluadoId && r.rol === a.rol
    ).length;
    return count < DEFAULT_COMPETENCIAS.length;
  });
}

export interface ResultadoEvaluado {
  evaluadoId: string;
  nombre: string;
  apellido: string;
  area: string;
  puntajeGlobal: number;
  porRol: Partial<Record<EvaluacionRol, number>>;
  porCompetencia: { competencia: string; puntaje: number }[];
}

function promedio(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function calcularResultadoEvaluado(
  evaluadoId: string,
  nombre: string,
  apellido: string,
  area: string,
  respuestas: { rol: EvaluacionRol; competencia: string; puntaje: number }[],
  pesos: Evaluacion360Pesos
): ResultadoEvaluado {
  const porRol: Partial<Record<EvaluacionRol, number>> = {};
  const roles: EvaluacionRol[] = ["AUTOEVALUACION", "GERENTE", "PAR", "SUBORDINADO"];

  for (const rol of roles) {
    const pts = respuestas.filter((r) => r.rol === rol).map((r) => r.puntaje);
    if (pts.length > 0) porRol[rol] = promedio(pts);
  }

  const pesosActivos: { rol: EvaluacionRol; peso: number }[] = [];
  if (porRol.AUTOEVALUACION != null) pesosActivos.push({ rol: "AUTOEVALUACION", peso: pesos.autoevaluacion });
  if (porRol.GERENTE != null) pesosActivos.push({ rol: "GERENTE", peso: pesos.gerente });
  if (porRol.PAR != null) pesosActivos.push({ rol: "PAR", peso: pesos.par });
  if (porRol.SUBORDINADO != null) pesosActivos.push({ rol: "SUBORDINADO", peso: pesos.subordinado });

  let puntajeGlobal = 0;
  if (pesosActivos.length > 0) {
    const totalPeso = pesosActivos.reduce((s, p) => s + p.peso, 0);
    puntajeGlobal =
      Math.round(
        (pesosActivos.reduce((s, p) => s + (porRol[p.rol] ?? 0) * (p.peso / totalPeso), 0) * 10)
      ) / 10;
  }

  const porCompetencia = DEFAULT_COMPETENCIAS.map((competencia) => ({
    competencia,
    puntaje: promedio(
      respuestas.filter((r) => r.competencia === competencia).map((r) => r.puntaje)
    ),
  }));

  return {
    evaluadoId,
    nombre,
    apellido,
    area,
    puntajeGlobal,
    porRol,
    porCompetencia,
  };
}

export async function getResultadosCiclo(cicloId: string): Promise<ResultadoEvaluado[]> {
  const ciclo = await prisma.evaluacion360Ciclo.findUnique({
    where: { id: cicloId },
    select: { organizationId: true },
  });
  if (!ciclo) return [];

  const pesos = await getEvaluacion360Pesos(ciclo.organizationId);

  const respuestas = await prisma.evaluacion360Respuesta.findMany({
    where: { cicloId },
    include: {
      evaluado: { include: { area: true } },
    },
  });

  const byEvaluado = new Map<string, typeof respuestas>();
  for (const r of respuestas) {
    const list = byEvaluado.get(r.evaluadoId) ?? [];
    list.push(r);
    byEvaluado.set(r.evaluadoId, list);
  }

  return Array.from(byEvaluado.entries()).map(([evaluadoId, rows]) => {
    const ev = rows[0].evaluado;
    return calcularResultadoEvaluado(
      evaluadoId,
      ev.nombre,
      ev.apellido,
      ev.area.nombre,
      rows.map((r) => ({ rol: r.rol, competencia: r.competencia, puntaje: r.puntaje })),
      pesos
    );
  });
}

export async function getActiveCiclo(organizationId: string) {
  return prisma.evaluacion360Ciclo.findFirst({
    where: { organizationId, activo: true, fechaFin: { gte: new Date() } },
    orderBy: { fechaInicio: "desc" },
  });
}

export function canManageEvaluaciones(role: Role): boolean {
  return role === "ADMINISTRADOR";
}
