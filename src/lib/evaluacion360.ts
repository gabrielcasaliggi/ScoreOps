import type { EvaluacionRol, Role, User } from "@prisma/client";
import { prisma } from "./prisma";
import {
  getEvaluacion360Pesos,
  DEFAULT_EVALUACION_360_PESOS,
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

    // Fallback: admin evalúa como gerente solo si no hay un GERENTE real en el área.
    if (
      evaluador.role === "ADMINISTRADOR" &&
      evaluado.role === "EMPLEADO" &&
      !gerentes.some((g) => g.role === "GERENTE" && g.areaId === evaluado.areaId)
    ) {
      assignments.push({
        cicloId,
        evaluadoId: evaluado.id,
        evaluadoNombre: label,
        evaluadorId: evaluador.id,
        rol: "GERENTE",
      });
    }

    // Los empleados no evalúan a pares automáticamente: solo autoevaluación
    // y a su gerente (SUBORDINADO). Evita que vean/respondan evaluaciones ajenas.

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
  areaId: string;
  puntajeGlobal: number;
  porRol: Partial<Record<EvaluacionRol, number>>;
  porCompetencia: { competencia: string; puntaje: number }[];
}

function promedio(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export interface ContribucionRol {
  rol: EvaluacionRol;
  promedio: number;
  /** Peso configurado (ej. 0.1). */
  pesoConfig: number;
  /** % efectivo tras reequilibrar roles presentes. */
  pesoEfectivoPct: number;
  /** Aporte al global (promedio × peso efectivo). */
  aporte: number;
}

/** Desglose del puntaje global: solo roles con respuestas, pesos reequilibrados. */
export function calcularContribucionesPorRol(
  porRol: Partial<Record<EvaluacionRol, number>>,
  pesos: Evaluacion360Pesos
): ContribucionRol[] {
  const entries: { rol: EvaluacionRol; peso: number; promedio: number }[] = [];
  if (porRol.AUTOEVALUACION != null) {
    entries.push({ rol: "AUTOEVALUACION", peso: pesos.autoevaluacion, promedio: porRol.AUTOEVALUACION });
  }
  if (porRol.GERENTE != null) {
    entries.push({ rol: "GERENTE", peso: pesos.gerente, promedio: porRol.GERENTE });
  }
  if (porRol.PAR != null) {
    entries.push({ rol: "PAR", peso: pesos.par, promedio: porRol.PAR });
  }
  if (porRol.SUBORDINADO != null) {
    entries.push({ rol: "SUBORDINADO", peso: pesos.subordinado, promedio: porRol.SUBORDINADO });
  }

  const totalPeso = entries.reduce((s, e) => s + e.peso, 0);
  if (totalPeso === 0) return [];

  return entries.map((e) => {
    const efectivo = e.peso / totalPeso;
    return {
      rol: e.rol,
      promedio: e.promedio,
      pesoConfig: e.peso,
      pesoEfectivoPct: Math.round(efectivo * 1000) / 10,
      aporte: Math.round(e.promedio * efectivo * 10) / 10,
    };
  });
}

export function calcularResultadoEvaluado(
  evaluadoId: string,
  nombre: string,
  apellido: string,
  area: string,
  respuestas: { rol: EvaluacionRol; competencia: string; puntaje: number }[],
  pesos: Evaluacion360Pesos,
  areaId = ""
): ResultadoEvaluado {
  const porRol: Partial<Record<EvaluacionRol, number>> = {};
  const roles: EvaluacionRol[] = ["AUTOEVALUACION", "GERENTE", "PAR", "SUBORDINADO"];

  for (const rol of roles) {
    const pts = respuestas.filter((r) => r.rol === rol).map((r) => r.puntaje);
    if (pts.length > 0) porRol[rol] = promedio(pts);
  }

  const contribuciones = calcularContribucionesPorRol(porRol, pesos);
  const puntajeGlobal =
    contribuciones.length === 0
      ? 0
      : Math.round(contribuciones.reduce((s, c) => s + c.aporte, 0) * 10) / 10;

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
    areaId,
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
      pesos,
      ev.areaId
    );
  });
}

export interface CoberturaRol {
  rol: EvaluacionRol;
  completa: boolean;
  respuestas: number;
  total: number;
}

/** Resultado agregado solo del evaluado indicado (sin filtrar ajenos). */
export async function getResultadoParaEvaluado(
  cicloId: string,
  evaluadoId: string
): Promise<{
  resultado: ResultadoEvaluado | null;
  cobertura: CoberturaRol[];
  pesos: Evaluacion360Pesos;
  contribuciones: ContribucionRol[];
}> {
  const ciclo = await prisma.evaluacion360Ciclo.findUnique({
    where: { id: cicloId },
    select: { organizationId: true },
  });
  if (!ciclo) {
    return {
      resultado: null,
      cobertura: [],
      pesos: DEFAULT_EVALUACION_360_PESOS,
      contribuciones: [],
    };
  }

  const pesos = await getEvaluacion360Pesos(ciclo.organizationId);

  const [evaluado, respuestas] = await Promise.all([
    prisma.user.findFirst({
      where: { id: evaluadoId, organizationId: ciclo.organizationId },
      include: { area: true },
    }),
    prisma.evaluacion360Respuesta.findMany({
      where: { cicloId, evaluadoId },
      select: { rol: true, competencia: true, puntaje: true, evaluadorId: true },
    }),
  ]);

  if (!evaluado) {
    return { resultado: null, cobertura: [], pesos, contribuciones: [] };
  }

  const rolesEsperados: EvaluacionRol[] =
    evaluado.role === "GERENTE"
      ? ["AUTOEVALUACION", "SUBORDINADO"]
      : ["AUTOEVALUACION", "GERENTE"];

  const cobertura: CoberturaRol[] = rolesEsperados.map((rol) => {
    const delRol = respuestas.filter((r) => r.rol === rol);
    const porEvaluador = new Map<string, number>();
    for (const r of delRol) {
      porEvaluador.set(r.evaluadorId, (porEvaluador.get(r.evaluadorId) ?? 0) + 1);
    }
    const completa = [...porEvaluador.values()].some((n) => n >= DEFAULT_COMPETENCIAS.length);
    return {
      rol,
      completa,
      respuestas: delRol.length,
      total: DEFAULT_COMPETENCIAS.length,
    };
  });

  if (respuestas.length === 0) {
    return { resultado: null, cobertura, pesos, contribuciones: [] };
  }

  const resultado = calcularResultadoEvaluado(
    evaluado.id,
    evaluado.nombre,
    evaluado.apellido,
    evaluado.area.nombre,
    respuestas.map((r) => ({ rol: r.rol, competencia: r.competencia, puntaje: r.puntaje })),
    pesos,
    evaluado.areaId
  );

  return {
    resultado,
    cobertura,
    pesos,
    contribuciones: calcularContribucionesPorRol(resultado.porRol, pesos),
  };
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
