import { test } from "node:test";
import assert from "node:assert/strict";
import { formatKg, kgToPoolUnits, poolUnitsToKg } from "./fruit-stock.ts";
import { fruitShortfall } from "./pricing.ts";

test("кг ↔ нэгж", () => {
  assert.equal(kgToPoolUnits(80), 160);
  assert.equal(kgToPoolUnits(1.5), 3);
  assert.equal(kgToPoolUnits(-2), -4);
  assert.equal(kgToPoolUnits(0.3), null);
  assert.equal(poolUnitsToKg(161), 80.5);
  assert.equal(formatKg(80), "80 кг");
  assert.equal(formatKg(80.5), "80.5 кг");
});

test("жимсний доод дүн", () => {
  const ids = new Set(["f1", "f2"]);
  const items = [
    { productId: "f1", price: 15_500, quantity: 1 },
    { productId: "v1", price: 50_000, quantity: 1 },
  ];
  assert.deepEqual(fruitShortfall(items, ids, 40_000), { fruitSubtotal: 15_500, shortfall: 24_500 });
  assert.equal(fruitShortfall(items, ids, 40_000, true).shortfall, 0);
  assert.equal(fruitShortfall([{ productId: "v1", price: 5_000, quantity: 1 }], ids, 40_000).shortfall, 0);
  assert.equal(fruitShortfall([{ productId: "f2", price: 92_000, quantity: 1 }], ids, 40_000).shortfall, 0);
});
