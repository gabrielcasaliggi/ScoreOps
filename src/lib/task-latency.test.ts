import { describe, expect, it } from "vitest";
import { aggregateLatencies, computeTaskLatency } from "./task-latency";

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
  it("calcula demora inicio, activo y total", () => {
    const result = computeTaskLatency(base);
    expect(result).toEqual({
      demoraInicioMin: 120,
      tiempoActivoMin: 120,
      tiempoTotalMin: 240,
    });
  });

  it("excluye demora inicio si startedAt fue backfilleado a createdAt", () => {
    const result = computeTaskLatency({
      ...base,
      createdAt: new Date("2026-01-01T12:00:00Z"),
      startedAt: new Date("2026-01-01T12:00:00Z"),
    });
    expect(result?.demoraInicioMin).toBeNull();
    expect(result?.tiempoTotalMin).toBe(240);
  });

  it("retorna null si no está completada", () => {
    expect(computeTaskLatency({ ...base, estado: "EN_PROCESO" })).toBeNull();
  });
});

describe("aggregateLatencies", () => {
  it("agrega promedio y mediana", () => {
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
    expect(agg.count).toBe(2);
    expect(agg.demoraInicio.avg).toBe(90);
    expect(agg.tiempoTotal.avg).toBe(210);
  });
});
