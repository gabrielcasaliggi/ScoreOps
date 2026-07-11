import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canResolveWorkflow } from "./workflows";

describe("canResolveWorkflow", () => {
  it("administrador puede resolver cualquier área", () => {
    assert.equal(canResolveWorkflow("ADMINISTRADOR", "area-a", "area-b"), true);
  });

  it("gerente solo su área", () => {
    assert.equal(canResolveWorkflow("GERENTE", "area-a", "area-a"), true);
    assert.equal(canResolveWorkflow("GERENTE", "area-a", "area-b"), false);
  });

  it("empleado no puede resolver", () => {
    assert.equal(canResolveWorkflow("EMPLEADO", "area-a", "area-a"), false);
  });
});
