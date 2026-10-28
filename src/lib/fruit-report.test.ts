/**
 * summarizeFruitSales — Vidan fruit-ийн тайлан.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { summarizeFruitSales } from "./fruit-report.ts";

const FRUIT = new Set(["gala", "red"]);
const item = (product_id: string, quantity: number, unit_price: number) => ({
  product_id,
  product_name: product_id,
  product_sku: null,
  quantity,
  unit_price,
});

describe("summarizeFruitSales", () => {
  test("холимог захиалгад зөвхөн жимсний мөрийг тооцно", () => {
    const r = summarizeFruitSales(
      [
        { id: "o1", user_id: "u1", items: [item("gala", 2, 70_000), item("vidan-honey", 3, 7_800)] },
        { id: "o2", user_id: "u2", items: [item("red", 1, 70_000)] },
        { id: "o3", user_id: "u3", items: [item("vidan-salad", 5, 4_800)] },
      ],
      FRUIT,
    );
    assert.equal(r.orders, 2);
    assert.equal(r.quantity, 3);
    assert.equal(r.revenue, 210_000);
    assert.equal(r.customers, 2);
    assert.deepEqual(r.byProduct.map((p) => [p.name, p.quantity]), [["gala", 2], ["red", 1]]);
  });

  test("нэг хэрэглэгчийн олон захиалга — хэрэглэгч нэг", () => {
    const r = summarizeFruitSales(
      [
        { id: "o1", user_id: "u1", items: [item("gala", 1, 70_000)] },
        { id: "o2", user_id: "u1", items: [item("gala", 1, 70_000)] },
      ],
      FRUIT,
    );
    assert.equal(r.customers, 1);
    assert.equal(r.orders, 2);
  });

  test("жимсгүй бол бүгд тэг", () => {
    const r = summarizeFruitSales([{ id: "o", user_id: "u", items: [item("x", 1, 100)] }], FRUIT);
    assert.deepEqual(r, { orders: 0, quantity: 0, revenue: 0, customers: 0, byProduct: [] });
  });
});
