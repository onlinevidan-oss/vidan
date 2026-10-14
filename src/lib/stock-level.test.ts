import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LOW_STOCK_LIMIT, stockLevel } from "./stock-level.ts";

describe("stockLevel", () => {
  test("босго бүх бараанд 20", () => {
    assert.equal(LOW_STOCK_LIMIT, 20);
  });

  test("0 ба түүнээс бага — дууссан, 'дуусч буй'-д давхар орохгүй", () => {
    assert.equal(stockLevel(0), "out");
    assert.equal(stockLevel(-3), "out");
    assert.equal(stockLevel(null), "out");
    assert.equal(stockLevel(undefined), "out");
  });

  test("1–20 — дуусч буй (заагийг оруулна)", () => {
    assert.equal(stockLevel(1), "low");
    assert.equal(stockLevel(15), "low");
    assert.equal(stockLevel(20), "low");
  });

  test("21-ээс дээш — хангалттай", () => {
    assert.equal(stockLevel(21), "ok");
    assert.equal(stockLevel(107), "ok");
  });
});
