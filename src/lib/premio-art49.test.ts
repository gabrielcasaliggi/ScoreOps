import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analizarAsistenciaArt49,
  calcularPremioArt49,
  mesesAntiguedad,
} from "./premio-art49";
import { DEFAULT_ART49_CONFIG } from "./art49-types";
import type { ProductivityPeriod } from "./productivity-period";

const periodoS1: ProductivityPeriod = {
  id: "2026-S1",
  label: "S1 2026",
  semester: 1,
  anioCalculo: 2026,
  inicio: new Date(2026, 0, 1),
  fin: new Date(2026, 5, 30, 23, 59, 59, 999),
  esActual: true,
  mesesCalculoLabel: "Enero – Junio 2026",
  fechaLiquidacion: new Date(2026, 8, 30),
  mesPagoLabel: "Septiembre 2026",
  liquidacionDescripcion: "Pago S1 en septiembre 2026",
};

function baseInput(
  overrides: Partial<Parameters<typeof calcularPremioArt49>[0]> = {}
) {
  return {
    fechaAlta: new Date(2020, 0, 1),
    sueldoBasico: 1_000_000,
    valorAntiguedad: 100_000,
    asistencias: [] as { tipo: "PRESENTE"; minutosTarde: null }[],
    metasColectivas: [
      { tipo: "REPARACIONES" as const, valorMeta: 95, valorActual: 96 },
      { tipo: "PULSOS" as const, valorMeta: 100, valorActual: 100 },
      { tipo: "COBRANZAS" as const, valorMeta: 80, valorActual: 85 },
    ],
    period: periodoS1,
    config: DEFAULT_ART49_CONFIG,
    ...overrides,
  };
}

describe("mesesAntiguedad", () => {
  it("cuenta meses completos hasta la fecha de referencia", () => {
    const alta = new Date(2024, 0, 15);
    const ref = new Date(2024, 5, 20);
    assert.equal(mesesAntiguedad(alta, ref), 5);
  });

  it("no devuelve negativos", () => {
    assert.equal(mesesAntiguedad(new Date(2026, 0, 1), new Date(2025, 0, 1)), 0);
  });
});

describe("analizarAsistenciaArt49", () => {
  it("asistencia perfecta sin registros", () => {
    const r = analizarAsistenciaArt49([]);
    assert.equal(r.asistenciaPerfecta, true);
    assert.equal(r.bloqueaTramosCondicionales, false);
  });

  it("impuntualidad leve dentro del límite", () => {
    const r = analizarAsistenciaArt49([
      { tipo: "IMPUNTUALIDAD", minutosTarde: 3 },
      { tipo: "IMPUNTUALIDAD", minutosTarde: 5 },
    ]);
    assert.equal(r.impuntualidadesLeves, 2);
    assert.equal(r.asistenciaPerfecta, true);
  });

  it("impuntualidad grave bloquea tramos condicionales", () => {
    const r = analizarAsistenciaArt49([
      { tipo: "IMPUNTUALIDAD", minutosTarde: 10 },
    ]);
    assert.equal(r.impuntualidadesGraves, 1);
    assert.equal(r.bloqueaTramosCondicionales, true);
    assert.equal(r.asistenciaPerfecta, false);
  });

  it("inasistencia injustificada bloquea tramos b–e", () => {
    const r = analizarAsistenciaArt49([
      { tipo: "INASISTENCIA_INJUSTIFICADA", minutosTarde: null },
    ]);
    assert.equal(r.inasistenciasInjustificadas, 1);
    assert.equal(r.bloqueaTramosCondicionales, true);
  });

  it("demasiadas impuntualidades leves pierde tramo b", () => {
    const registros = Array.from({ length: 6 }, () => ({
      tipo: "IMPUNTUALIDAD" as const,
      minutosTarde: 2,
    }));
    const r = analizarAsistenciaArt49(registros);
    assert.equal(r.impuntualidadesLeves, 6);
    assert.equal(r.asistenciaPerfecta, false);
  });
});

describe("calcularPremioArt49", () => {
  it("rechaza por antigüedad insuficiente", () => {
    const r = calcularPremioArt49(
      baseInput({
        fechaAlta: new Date(2026, 4, 1),
      })
    );
    assert.equal(r.elegible, false);
    assert.equal(r.porcentajeTotal, 0);
    assert.match(r.motivoInelegible ?? "", /Antigüedad insuficiente/);
  });

  it("otorga todos los tramos con escenario ideal", () => {
    const r = calcularPremioArt49(baseInput());
    assert.equal(r.elegible, true);
    assert.equal(r.porcentajeTotal, 50);
    assert.equal(r.montoTotal, 550_000);
    assert.deepEqual(
      r.tramos.filter((t) => t.activo).map((t) => t.id),
      ["a", "b", "c", "d", "e"]
    );
  });

  it("solo tramo a si hay falta injustificada", () => {
    const r = calcularPremioArt49(
      baseInput({
        asistencias: [{ tipo: "INASISTENCIA_INJUSTIFICADA", minutosTarde: null }],
      })
    );
    assert.equal(r.elegible, true);
    assert.equal(r.porcentajeTotal, 30);
    const activos = r.tramos.filter((t) => t.activo);
    assert.equal(activos.length, 1);
    assert.equal(activos[0].id, "a");
  });

  it("pierde tramo b por metas colectivas incumplidas sin bloqueo individual", () => {
    const r = calcularPremioArt49(
      baseInput({
        metasColectivas: [
          { tipo: "REPARACIONES", valorMeta: 95, valorActual: 50 },
          { tipo: "PULSOS", valorMeta: 100, valorActual: 50 },
          { tipo: "COBRANZAS", valorMeta: 80, valorActual: 50 },
        ],
      })
    );
    assert.equal(r.porcentajeTotal, 35);
    assert.equal(r.tramos.find((t) => t.id === "b")?.activo, true);
    assert.equal(r.tramos.find((t) => t.id === "c")?.activo, false);
  });

  it("calcula monto cero sin sueldo de referencia", () => {
    const r = calcularPremioArt49(
      baseInput({ sueldoBasico: null, valorAntiguedad: null })
    );
    assert.equal(r.porcentajeTotal, 50);
    assert.equal(r.montoTotal, 0);
  });
});
