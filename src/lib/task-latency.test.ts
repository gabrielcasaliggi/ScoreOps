import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateLatencies,
  computeTaskLatency,
  latencyComposition,
} from "./task-latency";

const base = {
  estado: "COMPLETADA" as const,
  assignedAt: new Date("2026-01-01T10:00:00Z"),
  startedAt: new Date("2026-01-01T12:00:00Z"),
  completedAt: new Date("2026-01-01T14:00:00Z"),
  createdAt: new Date("2026-01-01T09:00:00Z"),
  tiempoReal: 120,
  updatedAt: new Date("2026-01-01T14:00:00Z"),
};

describe("computeTaskLatency", () => {
  it("calcula demora inicio, activo, total y % ocioso", () => {
    assert.deepEqual(computeTaskLatency(base), {
      demoraInicioMin: 120,
      tiempoActivoMin: 120,
      tiempoTotalMin: 240,
      tiempoOciosoMin: 120,
      pctOcioso: 50,
    });
  });

  it("excluye demora inicio si startedAt fue backfilleado a createdAt", () => {
    const result = computeTaskLatency({
      ...base,
      createdAt: new Date("2026-01-01T12:00:00Z"),
      startedAt: new Date("2026-01-01T12:00:00Z"),
    });
    assert.equal(result?.demoraInicioMin, null);
    assert.equal(result?.tiempoOciosoMin, 120);
    assert.equal(result?.tiempoTotalMin, 240);
  });

  it("retorna null si no está completada", () => {
    assert.equal(computeTaskLatency({ ...base, estado: "EN_PROCESO" }), null);
  });
});

describe("aggregateLatencies", () => {
  it("agrega promedio, mediana y composición", () => {
    const agg = aggregateLatencies([
      base,
      {
        ...base,
        assignedAt: new Date("2026-01-02T10:00:00Z"),
        startedAt: new Date("2026-01-02T11:00:00Z"),
        completedAt: new Date("2026-01-02T13:00:00Z"),
        createdAt: new Date("2026-01-02T09:00:00Z"),
        tiempoReal: 120,
      },
    ]);
    assert.equal(agg.count, 2);
    assert.equal(agg.conInicioMedible, 2);
    assert.equal(agg.demoraInicio.avg, 90);
    assert.equal(agg.tiempoTotal.avg, 210);
    assert.equal(agg.tiempoOcioso.avg, 90);
    const comp = latencyComposition(agg);
    assert.equal(comp.ociosoPct + comp.activoPct, 100);
  });
});
