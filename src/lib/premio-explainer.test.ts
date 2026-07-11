import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { explicarPremioKpiSimple, explicarPremioArt49 } from "./premio-explainer";
import { DEFAULT_ART49_CONFIG } from "./art49-types";
import { DEFAULT_KPI_SIMPLE_CONFIG } from "./premio-templates";
import { calcularPremioArt49 } from "./premio-art49";

describe("premio-explainer", () => {
  it("explica bono KPI con citas de umbral", () => {
    const exp = explicarPremioKpiSimple(85, 12.8, DEFAULT_KPI_SIMPLE_CONFIG, "S1 2026");
    assert.equal(exp.plantilla, "kpi_simple");
    assert.equal(exp.porcentajeTotal, 12.8);
    assert.ok(exp.pasos.some((p) => p.activo));
    assert.ok(exp.citasGenerales.some((c) => c.fuente === "Período"));
  });

  it("explica Art.49 con tramos activos e inactivos", () => {
    const art49 = calcularPremioArt49({
      fechaAlta: new Date("2020-01-01"),
      sueldoBasico: 500000,
      valorAntiguedad: 50000,
      asistencias: [],
      metasColectivas: [
        { tipo: "REPARACIONES", valorMeta: 95, valorActual: 98 },
        { tipo: "PULSOS", valorMeta: 100, valorActual: 100 },
        { tipo: "COBRANZAS", valorMeta: 80, valorActual: 85 },
      ],
      period: {
        id: "2026-S1",
        label: "S1 2026",
        semester: 1 as const,
        anioCalculo: 2026,
        inicio: new Date("2026-01-01"),
        fin: new Date("2026-06-30"),
        esActual: true,
        mesesCalculoLabel: "Ene–Jun 2026",
        fechaLiquidacion: new Date("2026-09-30"),
        mesPagoLabel: "Septiembre 2026",
        liquidacionDescripcion: "Liquidación septiembre",
      },
      config: DEFAULT_ART49_CONFIG,
    });

    const exp = explicarPremioArt49(art49, "S1 2026");
    assert.equal(exp.plantilla, "art49_cooperativo");
    assert.equal(exp.pasos.length, 5);
    assert.ok(exp.pasos.filter((p) => p.activo).length >= 1);
    assert.ok(exp.recomendaciones.length >= 1);
  });
});
