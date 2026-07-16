import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSemesterPeriod, periodoIdFromDate } from "./productivity-period";

describe("getSemesterPeriod CCT", () => {
  it("en enero está en S1 oct–mar con pago en abril", () => {
    const p = getSemesterPeriod(0, new Date(2026, 0, 15));
    assert.equal(p.semester, 1);
    assert.equal(p.id, "2025-S1");
    assert.equal(p.inicio.getFullYear(), 2025);
    assert.equal(p.inicio.getMonth(), 9);
    assert.equal(p.fin.getFullYear(), 2026);
    assert.equal(p.fin.getMonth(), 2);
    assert.equal(p.mesPagoLabel, "Abril 2026");
    assert.equal(p.fechaLiquidacion.getMonth(), 3);
  });

  it("en julio está en S2 abr–sep con pago en octubre", () => {
    const p = getSemesterPeriod(0, new Date(2026, 6, 10));
    assert.equal(p.semester, 2);
    assert.equal(p.id, "2026-S2");
    assert.equal(p.inicio.getMonth(), 3);
    assert.equal(p.fin.getMonth(), 8);
    assert.equal(p.mesPagoLabel, "Octubre 2026");
    assert.equal(p.fechaLiquidacion.getMonth(), 9);
  });

  it("en octubre abre S1 del año en curso", () => {
    const p = getSemesterPeriod(0, new Date(2026, 9, 5));
    assert.equal(p.semester, 1);
    assert.equal(p.id, "2026-S1");
    assert.equal(p.mesPagoLabel, "Abril 2027");
  });

  it("offset -1 desde S2 va al S1 anterior", () => {
    const p = getSemesterPeriod(-1, new Date(2026, 6, 10));
    assert.equal(p.semester, 1);
    assert.equal(p.id, "2025-S1");
    assert.equal(p.mesPagoLabel, "Abril 2026");
  });

  it("offset -1 desde S1 (ene) va al S2 anterior", () => {
    const p = getSemesterPeriod(-1, new Date(2026, 0, 15));
    assert.equal(p.semester, 2);
    assert.equal(p.id, "2025-S2");
    assert.equal(p.mesPagoLabel, "Octubre 2025");
  });

  it("periodoIdFromDate coincide con el semestre actual", () => {
    assert.equal(periodoIdFromDate(new Date(2026, 0, 15)), "2025-S1");
    assert.equal(periodoIdFromDate(new Date(2026, 4, 1)), "2026-S2");
    assert.equal(periodoIdFromDate(new Date(2026, 10, 1)), "2026-S1");
  });
});
