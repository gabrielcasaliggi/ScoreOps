import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularPorcentajeReclamosSemestre } from "./reclamos-tramites";

describe("calcularPorcentajeReclamosSemestre", () => {
  const period = {
    inicio: new Date(2026, 3, 1),
    fin: new Date(2026, 8, 30, 23, 59, 59, 999),
  };

  it("devuelve null sin eventos en el semestre", () => {
    assert.equal(calcularPorcentajeReclamosSemestre([], period), null);
    assert.equal(
      calcularPorcentajeReclamosSemestre(
        [{ fecha: new Date(2025, 0, 1), estadoCumplido: true }],
        period
      ),
      null
    );
  });

  it("calcula el % de cumplidos en el rango", () => {
    const pct = calcularPorcentajeReclamosSemestre(
      [
        { fecha: new Date(2026, 4, 1), estadoCumplido: true },
        { fecha: new Date(2026, 5, 1), estadoCumplido: true },
        { fecha: new Date(2026, 6, 1), estadoCumplido: false },
        { fecha: new Date(2026, 0, 1), estadoCumplido: true }, // fuera
      ],
      period
    );
    assert.equal(pct, 66.7);
  });
});
