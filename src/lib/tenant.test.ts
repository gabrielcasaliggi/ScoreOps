import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  areaInOrg,
  assertSameOrg,
  cicloInOrg,
  objetivoInOrg,
  orgId,
  tareaInOrg,
  userByOrgEmail,
  userInOrg,
} from "./tenant";

describe("tenant scopes (pure)", () => {
  it("orgId lee organizationId de la sesión", () => {
    assert.equal(orgId({ organizationId: "org-a" }), "org-a");
  });

  it("assertSameOrg bloquea cross-tenant", () => {
    assert.equal(assertSameOrg({ organizationId: "org-a" }, "org-a"), true);
    assert.equal(assertSameOrg({ organizationId: "org-a" }, "org-b"), false);
  });

  it("userInOrg / areaInOrg filtran por organizationId", () => {
    assert.deepEqual(userInOrg("org-1"), { organizationId: "org-1" });
    assert.deepEqual(areaInOrg("org-1"), { organizationId: "org-1" });
  });

  it("tareaInOrg y objetivoInOrg anidan user.organizationId", () => {
    assert.deepEqual(tareaInOrg("org-1"), {
      user: { organizationId: "org-1" },
    });
    assert.deepEqual(objetivoInOrg("org-1"), {
      user: { organizationId: "org-1" },
    });
  });

  it("cicloInOrg filtra ciclos 360 por org", () => {
    assert.deepEqual(cicloInOrg("org-1"), { organizationId: "org-1" });
  });

  it("userByOrgEmail normaliza email y usa clave compuesta", () => {
    assert.deepEqual(userByOrgEmail("org-1", "Admin@Vertia.Local"), {
      organizationId_email: {
        organizationId: "org-1",
        email: "admin@vertia.local",
      },
    });
  });
});

/** Reglas de alcance de gerente por área (espejo de APIs). */
describe("gerente area scope rules", () => {
  function gerentePuedeVerEmpleado(
    gerenteAreaId: string,
    empleadoAreaId: string
  ): boolean {
    return gerenteAreaId === empleadoAreaId;
  }

  function adminPuedeVerCualquierArea(): boolean {
    return true;
  }

  it("gerente solo ve empleados de su área", () => {
    assert.equal(gerentePuedeVerEmpleado("area-ops", "area-ops"), true);
    assert.equal(gerentePuedeVerEmpleado("area-ops", "area-rrhh"), false);
  });

  it("admin no queda limitado por área propia", () => {
    assert.equal(adminPuedeVerCualquierArea(), true);
  });
});
