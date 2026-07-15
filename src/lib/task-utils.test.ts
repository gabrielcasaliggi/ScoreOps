import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ESTADOS_TAREA_FILTRO,
  badgeVariantEstadoTarea,
  labelEstadoTarea,
} from "./task-utils";

describe("labelEstadoTarea", () => {
  it("gerente/admin ven Por aprobar", () => {
    assert.equal(labelEstadoTarea("PENDIENTE_APROBACION", "GERENTE"), "Por aprobar");
    assert.equal(
      labelEstadoTarea("PENDIENTE_APROBACION", "ADMINISTRADOR"),
      "Por aprobar"
    );
  });

  it("empleado ve En revisión", () => {
    assert.equal(
      labelEstadoTarea("PENDIENTE_APROBACION", "EMPLEADO"),
      "En revisión"
    );
  });

  it("estados comunes son estables", () => {
    assert.equal(labelEstadoTarea("PENDIENTE"), "Pendiente");
    assert.equal(labelEstadoTarea("EN_PROCESO"), "En proceso");
    assert.equal(labelEstadoTarea("COMPLETADA"), "Completada");
  });

  it("no expone el enum crudo en UI conocida", () => {
    for (const estado of ESTADOS_TAREA_FILTRO) {
      const label = labelEstadoTarea(estado, "GERENTE");
      assert.equal(label.includes("_"), false);
    }
  });
});

describe("badgeVariantEstadoTarea", () => {
  it("marca warning en proceso y por aprobar", () => {
    assert.equal(badgeVariantEstadoTarea("EN_PROCESO"), "warning");
    assert.equal(badgeVariantEstadoTarea("PENDIENTE_APROBACION"), "warning");
    assert.equal(badgeVariantEstadoTarea("COMPLETADA"), "success");
    assert.equal(badgeVariantEstadoTarea("PENDIENTE"), "secondary");
  });
});
