import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularPremioKpiSimple,
  DEFAULT_KPI_SIMPLE_CONFIG,
} from "./premio-templates";

describe("calcularPremioKpiSimple", () => {
  it("devuelve 0 si KPI está bajo el umbral", () => {
    assert.equal(calcularPremioKpiSimple(50, DEFAULT_KPI_SIMPLE_CONFIG), 0);
  });

  it("escala linealmente hasta el máximo al 100% KPI", () => {
    assert.equal(calcularPremioKpiSimple(100, DEFAULT_KPI_SIMPLE_CONFIG), 15);
  });

  it("interpola entre umbral y 100%", () => {
    assert.equal(calcularPremioKpiSimple(85, DEFAULT_KPI_SIMPLE_CONFIG), 12.8);
  });

  it("respeta porcentaje máximo personalizado", () => {
    assert.equal(
      calcularPremioKpiSimple(100, { umbralMinimo: 60, porcentajeMaximo: 20 }),
      20
    );
  });
});
