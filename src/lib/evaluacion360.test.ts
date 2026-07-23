import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAssignmentsForUser,
  calcularResultadoEvaluado,
  DEFAULT_COMPETENCIAS,
} from "./evaluacion360";

const cicloId = "ciclo-1";

function user(
  partial: Partial<{
    id: string;
    nombre: string;
    apellido: string;
    role: "EMPLEADO" | "GERENTE" | "ADMINISTRADOR";
    areaId: string;
    activo: boolean;
  }>
) {
  return {
    id: partial.id ?? "u1",
    nombre: partial.nombre ?? "Nombre",
    apellido: partial.apellido ?? "Apellido",
    role: partial.role ?? "EMPLEADO",
    areaId: partial.areaId ?? "area-a",
    activo: partial.activo ?? true,
  };
}

describe("buildAssignmentsForUser", () => {
  const pepe = user({ id: "pepe", nombre: "Pepe", apellido: "Pepe", role: "EMPLEADO" });
  const maria = user({ id: "maria", nombre: "María", apellido: "López", role: "EMPLEADO" });
  const gerente = user({
    id: "ger",
    nombre: "Ana",
    apellido: "Gerente",
    role: "GERENTE",
  });
  const admin = user({
    id: "adm",
    nombre: "Admin",
    apellido: "Org",
    role: "ADMINISTRADOR",
    areaId: "area-a",
  });

  const empleados = [pepe, maria, gerente];
  const gerentesConAdmin = [gerente, admin];

  it("empleado solo se autoevalúa y evalúa a su gerente, no a pares", () => {
    const asg = buildAssignmentsForUser(pepe, empleados, gerentesConAdmin, cicloId);
    assert.deepEqual(
      asg.map((a) => ({ evaluadoId: a.evaluadoId, rol: a.rol })).sort((a, b) =>
        `${a.evaluadoId}-${a.rol}`.localeCompare(`${b.evaluadoId}-${b.rol}`)
      ),
      [
        { evaluadoId: "ger", rol: "SUBORDINADO" },
        { evaluadoId: "pepe", rol: "AUTOEVALUACION" },
      ]
    );
  });

  it("gerente evalúa a empleados de su área", () => {
    const asg = buildAssignmentsForUser(gerente, empleados, gerentesConAdmin, cicloId);
    const rolesHaciaPepe = asg.filter((a) => a.evaluadoId === "pepe");
    assert.equal(rolesHaciaPepe.length, 1);
    assert.equal(rolesHaciaPepe[0].rol, "GERENTE");
    assert.ok(asg.some((a) => a.evaluadoId === "ger" && a.rol === "AUTOEVALUACION"));
  });

  it("admin puede evaluar como gerente si no hay gerente real en el área", () => {
    const sinGerente = [pepe, maria];
    const soloAdmin = [admin];
    const asg = buildAssignmentsForUser(admin, sinGerente, soloAdmin, cicloId);
    assert.ok(asg.some((a) => a.evaluadoId === "pepe" && a.rol === "GERENTE"));
  });

  it("admin no toma rol GERENTE si ya hay un gerente en el área", () => {
    const asg = buildAssignmentsForUser(admin, empleados, gerentesConAdmin, cicloId);
    assert.equal(
      asg.filter((a) => a.rol === "GERENTE").length,
      0
    );
  });
});

describe("calcularResultadoEvaluado", () => {
  it("promedia por rol y pondera", () => {
    const respuestas = DEFAULT_COMPETENCIAS.flatMap((competencia) => [
      { rol: "AUTOEVALUACION" as const, competencia, puntaje: 4 },
      { rol: "GERENTE" as const, competencia, puntaje: 2 },
    ]);
    const result = calcularResultadoEvaluado(
      "pepe",
      "Pepe",
      "Pepe",
      "Ventas",
      respuestas,
      { autoevaluacion: 0.5, gerente: 0.5, par: 0, subordinado: 0 },
      "area-a"
    );
    assert.equal(result.porRol.AUTOEVALUACION, 4);
    assert.equal(result.porRol.GERENTE, 2);
    assert.equal(result.puntajeGlobal, 3);
  });
});
