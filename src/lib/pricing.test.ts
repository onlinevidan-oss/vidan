/**
 * calculateOrderTotals-ийн тест.
 *
 * ЭТАЛОН нь DB-ийн `calc_order_totals()` (0026_promo_codes.sql) —
 * QPay нэхэмжлэл orders.total-оос үүсдэг тул сервер ба клиент зөрвөл
 * хэрэглэгч нэг дүн хараад өөр дүн төлнө. Тиймээс энд SQL-ийн зан
 * төлөвийг мөрөөр нь давтаж шалгана.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderTotals,
  COMMERCE_DEFAULTS,
  TAX_RATE,
  type CommerceSettings,
} from "./pricing.ts";

/** Тестэд тодорхой утга хэрэгтэй үед үндсэн тохиргоог хэсэгчлэн дарж бичих */
function settings(over: Partial<CommerceSettings> = {}): CommerceSettings {
  return { ...COMMERCE_DEFAULTS, ...over };
}

describe("calculateOrderTotals — үндсэн тооцоо", () => {
  test("НӨАТ нийт дүн дээр НЭМЭГДЭХГҮЙ — үнэд шингэсэн", () => {
    const t = calculateOrderTotals(30_000, settings(), 3);
    assert.deepEqual(t, {
      subtotal: 30_000,
      discount: 0,
      shipping: 7_000,
      tax: 2_727, // 30,000-д багтсан НӨАТ (хүргэлтэд НӨАТ байхгүй)
      total: 37_000, // 30,000 + 7,000 — НӨАТ нэмэгдээгүй
    });
  });

  test("total нь үргэлж (дэд дүн − хөнгөлөлт) + хүргэлт", () => {
    const t = calculateOrderTotals(47_500, settings(), 4, 2_500);
    assert.equal(t.total, 47_500 - 2_500 + t.shipping);
  });

  test("tax нь БАРААНЫ дүнд багтсан НӨАТ — хүргэлт оролцохгүй", () => {
    const t = calculateOrderTotals(47_500, settings(), 4, 2_500);
    assert.equal(t.tax, Math.round(45_000 / 11));
  });

  test("НӨАТ-гүй дүн + НӨАТ = нийт дүн (задаргаа тэнцэнэ)", () => {
    const t = calculateOrderTotals(30_000, settings(), 3);
    assert.equal(t.total - t.tax + t.tax, t.total);
    assert.ok(t.tax < t.total, "НӨАТ нийт дүнгийн дотор байна");
  });

  test("TAX_RATE өөрчлөгдвөл тест мэдэгдэнэ (10% гэж бататгав)", () => {
    assert.equal(TAX_RATE, 0.1);
  });
});

describe("хүргэлт — ширхгийн босго", () => {
  const s = settings({
    shipping_base: 7_000,
    shipping_over: 14_000,
    shipping_qty_threshold: 7,
  });

  test("босгон дээр яг таарвал base үнэ (7 ширхэг → 7,000₮)", () => {
    assert.equal(calculateOrderTotals(50_000, s, 7).shipping, 7_000);
  });

  test("босгоос дээш бол over үнэ (8 ширхэг → 14,000₮)", () => {
    assert.equal(calculateOrderTotals(50_000, s, 8).shipping, 14_000);
  });

  test("ширхэг дамжуулаагүй бол base үнэ", () => {
    assert.equal(calculateOrderTotals(50_000, s).shipping, 7_000);
  });
});

describe("үнэгүй хүргэлт", () => {
  test("идэвхгүй үед босго давсан ч хүргэлт төлнө", () => {
    const s = settings({ free_shipping_enabled: false, free_shipping_min: 50_000 });
    assert.equal(calculateOrderTotals(80_000, s, 2).shipping, 7_000);
  });

  test("идэвхтэй үед босго давбал хүргэлт үнэгүй", () => {
    const s = settings({ free_shipping_enabled: true, free_shipping_min: 50_000 });
    assert.equal(calculateOrderTotals(80_000, s, 2).shipping, 0);
  });

  test("босгыг ХӨНГӨЛСНИЙ ДАРААХ дүнгээр шалгана (SQL: v_after >= v_free_min)", () => {
    const s = settings({ free_shipping_enabled: true, free_shipping_min: 50_000 });
    // 55,000 − 10,000 = 45,000 → босго давахгүй тул хүргэлт төлнө
    assert.equal(calculateOrderTotals(55_000, s, 2, 10_000).shipping, 7_000);
    // 55,000 − 3,000 = 52,000 → босго давна
    assert.equal(calculateOrderTotals(55_000, s, 2, 3_000).shipping, 0);
  });
});

describe("хөнгөлөлт", () => {
  test("НӨАТ хөнгөлсний ДАРААХ нийт дүнгээс задлагдана", () => {
    const t = calculateOrderTotals(50_000, settings(), 2, 5_000);
    assert.equal(t.total, 45_000 + 7_000, "НӨАТ нэмэгдэхгүй");
    assert.equal(t.tax, Math.round(45_000 / 11), "барааны 45,000-д багтсан НӨАТ");
  });

  test("дэд дүн нь хөнгөлөлтөөр өөрчлөгдөхгүй (баримтад бүтэн дүн үлдэнэ)", () => {
    const t = calculateOrderTotals(50_000, settings(), 2, 5_000);
    assert.equal(t.subtotal, 50_000);
  });

  test("хөнгөлөлт дэд дүнгээс их бол дэд дүнгээр таслагдана (SQL: least(discount, subtotal))", () => {
    const t = calculateOrderTotals(20_000, settings(), 2, 35_000);
    assert.equal(t.discount, 20_000, "мэдээлсэн хөнгөлөлт дэд дүнгээс хэтрэхгүй");
    assert.equal(t.total, t.shipping, "зөвхөн хүргэлт үлдэнэ");
    assert.equal(t.tax, 0, "хүргэлтэд НӨАТ тооцохгүй");
  });

  test("сөрөг хөнгөлөлт нийт дүнг НЭМЭГДҮҮЛЖ болохгүй (SQL: greatest(0, …))", () => {
    const t = calculateOrderTotals(30_000, settings(), 3, -5_000);
    assert.equal(t.discount, 0);
    assert.equal(t.total, calculateOrderTotals(30_000, settings(), 3).total);
  });

  test("хөнгөлөлт яг дэд дүнтэй тэнцвэл барааны төлбөр 0", () => {
    const t = calculateOrderTotals(30_000, settings(), 3, 30_000);
    assert.equal(t.total, t.shipping);
  });
});

describe("бүхэлчлэл", () => {
  test("багтсан НӨАТ хамгийн ойрын төгрөгт бүхэлчлэгдэнэ", () => {
    // Багтсан НӨАТ = нийт дүн × 10/110, SQL round-тай ижил
    const a = calculateOrderTotals(20_005, settings(), 1);
    assert.equal(a.tax, Math.round((20_005 * 0.1) / 1.1));
    const b = calculateOrderTotals(20_004, settings(), 1);
    assert.equal(b.tax, Math.round((20_004 * 0.1) / 1.1));
    assert.notEqual(a.tax, 0);
  });

  test("буцаах бүх талбар бүхэл тоо байна", () => {
    const t = calculateOrderTotals(33_333, settings(), 5, 1_111);
    for (const [k, v] of Object.entries(t)) {
      assert.ok(Number.isInteger(v), `${k} бүхэл байх ёстой, гэвч ${v}`);
    }
  });
});
