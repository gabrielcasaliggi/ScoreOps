import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Reglas anti-IDOR documentadas (espejo de APIs).
 * Cross-tenant / fuera de área → 404 (no revelar existencia).
 */

function canAccessEmployeeInOrg(opts: {
  callerOrgId: string;
  targetOrgId: string;
  callerRole: "ADMINISTRADOR" | "GERENTE" | "EMPLEADO";
  callerAreaId: string | null;
  targetAreaId: string;
  callerUserId: string;
  targetUserId: string;
}): { ok: boolean; status: 200 | 403 | 404 } {
  if (opts.callerOrgId !== opts.targetOrgId) {
    return { ok: false, status: 404 };
  }
  if (opts.callerRole === "EMPLEADO" && opts.callerUserId !== opts.targetUserId) {
    return { ok: false, status: 403 };
  }
  if (
    opts.callerRole === "GERENTE" &&
    opts.callerAreaId !== opts.targetAreaId
  ) {
    return { ok: false, status: 403 };
  }
  return { ok: true, status: 200 };
}

function notificationFanoutScope(opts: {
  role: "ADMINISTRADOR" | "GERENTE";
  organizationId: string;
  areaId: string;
}): { organizationId: string; areaId?: string } {
  return {
    organizationId: opts.organizationId,
    ...(opts.role === "GERENTE" ? { areaId: opts.areaId } : {}),
  };
}

describe("anti-IDOR access matrix", () => {
  it("bloquea empleado de otra organización (404)", () => {
    const r = canAccessEmployeeInOrg({
      callerOrgId: "org-a",
      targetOrgId: "org-b",
      callerRole: "ADMINISTRADOR",
      callerAreaId: null,
      targetAreaId: "area-x",
      callerUserId: "admin-a",
      targetUserId: "emp-b",
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 404);
  });

  it("gerente no simula/consulta fuera de su área", () => {
    const r = canAccessEmployeeInOrg({
      callerOrgId: "org-a",
      targetOrgId: "org-a",
      callerRole: "GERENTE",
      callerAreaId: "ops",
      targetAreaId: "rrhh",
      callerUserId: "g1",
      targetUserId: "e1",
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 403);
  });

  it("gerente accede a su área", () => {
    const r = canAccessEmployeeInOrg({
      callerOrgId: "org-a",
      targetOrgId: "org-a",
      callerRole: "GERENTE",
      callerAreaId: "ops",
      targetAreaId: "ops",
      callerUserId: "g1",
      targetUserId: "e1",
    });
    assert.equal(r.ok, true);
  });

  it("empleado solo a sí mismo", () => {
    const self = canAccessEmployeeInOrg({
      callerOrgId: "org-a",
      targetOrgId: "org-a",
      callerRole: "EMPLEADO",
      callerAreaId: "ops",
      targetAreaId: "ops",
      callerUserId: "e1",
      targetUserId: "e1",
    });
    const other = canAccessEmployeeInOrg({
      callerOrgId: "org-a",
      targetOrgId: "org-a",
      callerRole: "EMPLEADO",
      callerAreaId: "ops",
      targetAreaId: "ops",
      callerUserId: "e1",
      targetUserId: "e2",
    });
    assert.equal(self.ok, true);
    assert.equal(other.ok, false);
  });
});

describe("notification fanout scope", () => {
  it("admin regenera solo su org", () => {
    assert.deepEqual(
      notificationFanoutScope({
        role: "ADMINISTRADOR",
        organizationId: "org-a",
        areaId: "ops",
      }),
      { organizationId: "org-a" }
    );
  });

  it("gerente regenera solo su área", () => {
    assert.deepEqual(
      notificationFanoutScope({
        role: "GERENTE",
        organizationId: "org-a",
        areaId: "ops",
      }),
      { organizationId: "org-a", areaId: "ops" }
    );
  });
});
