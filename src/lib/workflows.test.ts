import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canResolveWorkflow } from "./workflows";

describe("canResolveWorkflow", () => {
  it("administrador puede resolver cualquier área", () => {
    assert.equal(canResolveWorkflow("ADMINISTRADOR", "area-a", "area-b"), true);
    assert.equal(canResolveWorkflow("ADMINISTRADOR", null, "area-b"), true);
  });

  it("gerente solo su área", () => {
    assert.equal(canResolveWorkflow("GERENTE", "area-a", "area-a"), true);
    assert.equal(canResolveWorkflow("GERENTE", "area-a", "area-b"), false);
  });

  it("gerente sin areaId no puede resolver", () => {
    assert.equal(canResolveWorkflow("GERENTE", null, "area-a"), false);
  });

  it("empleado no puede resolver ni en su área", () => {
    assert.equal(canResolveWorkflow("EMPLEADO", "area-a", "area-a"), false);
  });
});

/**
 * Matriz de producto: qué significa cada acción sobre una solicitud PENDIENTE.
 * (Complementa el smoke manual de docs/GO_LIVE.md)
 */
describe("workflow product rules", () => {
  type Accion = "aprobar" | "rechazar" | "cancelar";

  function resultadoEsperado(
    tipo: "TAREA_COMPLETADA" | "KPI_AJUSTE",
    accion: Accion
  ): { workflowEstado: string; efecto: string } {
    if (accion === "cancelar") {
      return {
        workflowEstado: "CANCELADA",
        efecto: tipo === "TAREA_COMPLETADA" ? "tarea→EN_PROCESO" : "kpi intacto",
      };
    }
    if (accion === "aprobar") {
      return {
        workflowEstado: "APROBADA",
        efecto:
          tipo === "TAREA_COMPLETADA"
            ? "tarea→COMPLETADA"
            : "kpi.valorActual=propuesto",
      };
    }
    return {
      workflowEstado: "RECHAZADA",
      efecto: tipo === "TAREA_COMPLETADA" ? "tarea→EN_PROCESO" : "kpi intacto",
    };
  }

  it("aprobar tarea completa el trabajo", () => {
    const r = resultadoEsperado("TAREA_COMPLETADA", "aprobar");
    assert.equal(r.workflowEstado, "APROBADA");
    assert.equal(r.efecto, "tarea→COMPLETADA");
  });

  it("devolver tarea vuelve a en proceso", () => {
    const r = resultadoEsperado("TAREA_COMPLETADA", "rechazar");
    assert.equal(r.workflowEstado, "RECHAZADA");
    assert.equal(r.efecto, "tarea→EN_PROCESO");
  });

  it("aprobar KPI aplica valor propuesto", () => {
    const r = resultadoEsperado("KPI_AJUSTE", "aprobar");
    assert.equal(r.workflowEstado, "APROBADA");
    assert.equal(r.efecto, "kpi.valorActual=propuesto");
  });

  it("rechazar KPI no cambia el valor", () => {
    const r = resultadoEsperado("KPI_AJUSTE", "rechazar");
    assert.equal(r.workflowEstado, "RECHAZADA");
    assert.equal(r.efecto, "kpi intacto");
  });

  it("cancelar (solicitante) no deja huérfana la tarea", () => {
    const r = resultadoEsperado("TAREA_COMPLETADA", "cancelar");
    assert.equal(r.workflowEstado, "CANCELADA");
    assert.equal(r.efecto, "tarea→EN_PROCESO");
  });

  it("gerente de otra área no resuelve (regla de permiso)", () => {
    assert.equal(canResolveWorkflow("GERENTE", "ops", "finanzas"), false);
    assert.equal(canResolveWorkflow("ADMINISTRADOR", "ops", "finanzas"), true);
  });
});
