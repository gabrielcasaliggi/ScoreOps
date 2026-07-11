import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serializeError } from "./logger";

describe("serializeError", () => {
  it("extrae name, message y stack truncado", () => {
    const err = new Error("fallo de prueba");
    const out = serializeError(err);
    assert.equal(out.name, "Error");
    assert.equal(out.message, "fallo de prueba");
    assert.ok(Array.isArray(out.stack));
  });

  it("serializa valores no-Error", () => {
    assert.deepEqual(serializeError("texto"), { value: "texto" });
  });
});
