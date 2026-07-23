import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateLatencies,
  aggregateLatenciesForPeriod,
  computeOpenTaskLatency,
  computeTaskLatency,
  latencyComposition,
} from "./task-latency";
import type { ProductivityPeriod } from "./productivity-period";

const base = {
  id: "t1",
  titulo: "Tarea demo",
  estado: "COMPLETADA" as const,
  assignedAt: new Date("2026-01-01T10:00:00Z"),
  startedAt: new Date("2026-01-01T12:00:00Z"),
  completedAt: new Date("2026-01-01T14:00:00Z"),
  createdAt: new Date("2026-01-01T09:00:00Z"),
  tiempoReal: 120,
  updatedAt: new Date("2026-01-01T14:00:00Z"),
};

const period: ProductivityPeriod = {
  id: "2026-S1",
  label: "S1 2026",
  semester: 1,
  anioCalculo: 2026,
  inicio: new Date("2026-01-01T00:00:00Z"),
  fin: new Date("2026-06-30T23:59:59Z"),
  esActual: true,
  fechaLiquidacion: new Date("2026-07-01"),
  mesesCalculoLabel: "ene–jun",
  mesPagoLabel: "jul",
  liquidacionDescripcion: "test",
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

  it("capear tiempoReal si supera el ciclo", () => {
    const result = computeTaskLatency({
      ...base,
      tiempoReal: 9999,
    });
    assert.equal(result?.tiempoActivoMin, 120);
    assert.ok((result?.tiempoActivoMin ?? 0) <= (result?.tiempoTotalMin ?? 0));
  });

  it("retorna null si no está completada", () => {
    assert.equal(computeTaskLatency({ ...base, estado: "EN_PROCESO" }), null);
  });
});

describe("computeOpenTaskLatency", () => {
  it("pendiente: toda la demora es espera en curso", () => {
    const now = new Date("2026-01-01T11:00:00Z");
    const result = computeOpenTaskLatency(
      {
        ...base,
        estado: "PENDIENTE",
        startedAt: null,
        completedAt: null,
      },
      now
    );
    assert.equal(result?.demoraInicioMin, 60);
    assert.equal(result?.tiempoActivoMin, null);
    assert.equal(result?.tiempoTotalMin, 60);
    assert.equal(result?.pctOcioso, 100);
  });

  it("en proceso: separa espera y resolviendo hasta ahora", () => {
    const now = new Date("2026-01-01T14:00:00Z");
    const result = computeOpenTaskLatency(
      {
        ...base,
        estado: "EN_PROCESO",
        completedAt: null,
        tiempoReal: null,
      },
      now
    );
    assert.equal(result?.demoraInicioMin, 120);
    assert.equal(result?.tiempoActivoMin, 120);
    assert.equal(result?.tiempoTotalMin, 240);
  });
});

describe("aggregateLatencies", () => {
  it("agrega promedio y detalle por tarea", () => {
    const agg = aggregateLatencies([
      base,
      {
        ...base,
        id: "t2",
        titulo: "Otra",
        assignedAt: new Date("2026-01-02T10:00:00Z"),
        startedAt: new Date("2026-01-02T11:00:00Z"),
        completedAt: new Date("2026-01-02T13:00:00Z"),
        createdAt: new Date("2026-01-02T09:00:00Z"),
        tiempoReal: 120,
        user: { nombre: "Ana", apellido: "Pérez" },
      },
    ]);
    assert.equal(agg.count, 2);
    assert.equal(agg.conInicioMedible, 2);
    assert.equal(agg.demoraInicio.avg, 90);
    assert.equal(agg.tiempoTotal.avg, 210);
    assert.equal(agg.tiempoOcioso.avg, 90);
    assert.equal(agg.porTarea.length, 2);
    assert.equal(agg.porTarea[0]?.id, "t2");
    assert.equal(agg.porTarea[0]?.userNombre, "Ana Pérez");
    assert.equal(agg.porTarea[0]?.enCurso, false);
    const comp = latencyComposition(agg);
    assert.equal(comp.ociosoPct + comp.activoPct, 100);
  });

  it("incluye abiertas al inicio del detalle", () => {
    const now = new Date("2026-01-03T12:00:00Z");
    const agg = aggregateLatencies([base], {
      now,
      abiertas: [
        {
          ...base,
          id: "open1",
          titulo: "Nueva asignada",
          estado: "PENDIENTE",
          startedAt: null,
          completedAt: null,
          assignedAt: new Date("2026-01-03T10:00:00Z"),
          createdAt: new Date("2026-01-03T10:00:00Z"),
          user: { nombre: "Luis", apellido: "Gómez" },
        },
      ],
    });
    assert.equal(agg.count, 1);
    assert.equal(agg.abiertasCount, 1);
    assert.equal(agg.porTarea[0]?.id, "open1");
    assert.equal(agg.porTarea[0]?.enCurso, true);
    assert.equal(agg.porTarea[0]?.estado, "PENDIENTE");
    assert.equal(agg.porTarea[1]?.id, "t1");
  });

  it("omite detalle si detalleLimit es 0", () => {
    const agg = aggregateLatencies([base], { detalleLimit: 0 });
    assert.equal(agg.count, 1);
    assert.equal(agg.porTarea.length, 0);
  });
});

describe("aggregateLatenciesForPeriod", () => {
  it("lista abiertas aunque no estén completadas", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const agg = aggregateLatenciesForPeriod(
      [
        {
          ...base,
          id: "open2",
          titulo: "Abierta hoy",
          estado: "PENDIENTE",
          startedAt: null,
          completedAt: null,
          assignedAt: new Date("2026-03-01T10:00:00Z"),
          createdAt: new Date("2026-03-01T10:00:00Z"),
        },
      ],
      period,
      { now }
    );
    assert.equal(agg.count, 0);
    assert.equal(agg.abiertasCount, 1);
    assert.equal(agg.porTarea[0]?.titulo, "Abierta hoy");
  });
});
