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
  shippingForQty,
  type CommerceSettings,
} from "./pricing.ts";

/** Тестэд тодорхой утга хэрэгтэй үед үндсэн тохиргоог хэсэгчлэн дарж бичих */
function settings(over: Partial<CommerceSettings> = {}): CommerceSettings {
  return { ...COMMERCE_DEFAULTS, ...over };
}

describe("calculateOrderTotals — үндсэн тооцоо", () => {
  test("БАРААНД НӨАТ нэмэгдэхгүй — зөвхөн хүргэлтэд", () => {
    const t = calculateOrderTotals(30_000, settings(), 3);
    assert.deepEqual(t, {
      subtotal: 30_000,
      discount: 0,
      shipping: 7_000,
      tax: 700, // зөвхөн хүргэлтийн 7,000-ийн 10%
      total: 37_700, // 30,000 + 7,000 + 700
    });
  });

  test("total = (бараа − хөнгөлөлт) + хүргэлт + хүргэлтийн НӨАТ", () => {
    const t = calculateOrderTotals(47_500, settings(), 4, 2_500);
    assert.equal(t.total, 47_500 - 2_500 + t.shipping + t.tax);
  });

  test("tax нь ЗӨВХӨН хүргэлтийн үнийн 10% — барааны дүнгээс хамаарахгүй", () => {
    const a = calculateOrderTotals(47_500, settings(), 4, 2_500);
    const b = calculateOrderTotals(999_999, settings(), 4);
    assert.equal(a.tax, Math.round(a.shipping * 0.1));
    assert.equal(b.tax, Math.round(b.shipping * 0.1));
  });

  test("хүргэлт үнэгүй бол НӨАТ ч тэг", () => {
    const s = settings({ free_shipping_enabled: true, free_shipping_min: 50_000 });
    const t = calculateOrderTotals(80_000, s, 2);
    assert.equal(t.shipping, 0);
    assert.equal(t.tax, 0);
    assert.equal(t.total, 80_000);
  });

  test("TAX_RATE өөрчлөгдвөл тест мэдэгдэнэ (10% гэж бататгав)", () => {
    assert.equal(TAX_RATE, 0.1);
  });
});

describe("хүргэлт — шатлалт үнэ", () => {
  // 1–7ш → 7,000 · 8–15ш → 14,000 · дараа нь 10ш тутамд +7,000
  const cases: [number, number][] = [
    [1, 7_000], [7, 7_000],
    [8, 14_000], [15, 14_000],
    [16, 21_000], [25, 21_000],
    [26, 28_000], [35, 28_000],
    [36, 35_000], [45, 35_000],
    [46, 42_000],
  ];

  for (const [qty, expected] of cases) {
    test(`${qty} ширхэг → ${expected.toLocaleString()}₮`, () => {
      assert.equal(shippingForQty(qty), expected);
    });
  }

  test("calculateOrderTotals мөн ижил хүргэлт өгнө", () => {
    for (const [qty, expected] of cases) {
      assert.equal(
        calculateOrderTotals(100_000, settings(), qty).shipping,
        expected,
        `${qty} ширхэг`,
      );
    }
  });

  test("НӨАТ нь шатласан хүргэлтийн 10% байна", () => {
    const t = calculateOrderTotals(100_000, settings(), 26);
    assert.equal(t.shipping, 28_000);
    assert.equal(t.tax, 2_800);
    assert.equal(t.total, 100_000 + 28_000 + 2_800);
  });

  test("15 → 16 ширхэгт шат үсэрнэ, дундуур нь үсрэхгүй", () => {
    assert.equal(shippingForQty(15), 14_000);
    assert.equal(shippingForQty(16), 21_000);
    for (let q = 16; q <= 25; q++) assert.equal(shippingForQty(q), 21_000, `${q}ш`);
  });

  test("алхмын тохиргоо өөрчлөгдвөл дагана", () => {
    const s = settings({ shipping_step_qty: 5, shipping_step_price: 3_000 });
    assert.equal(shippingForQty(16, s), 17_000, "14,000 + 3,000");
    assert.equal(shippingForQty(20, s), 17_000);
    assert.equal(shippingForQty(21, s), 20_000);
  });

  test("алхам 0 байсан ч хуваахад алдаа гаргахгүй", () => {
    const s = settings({ shipping_step_qty: 0 });
    assert.ok(Number.isFinite(shippingForQty(100, s)));
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

  test("2-р шатны дээдээс дээш бол шатлан нэмэгдэнэ (16 ширхэг)", () => {
    assert.equal(calculateOrderTotals(50_000, s, 16).shipping, 21_000);
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
    assert.equal(t.total, 45_000 + 7_000 + 700, "бараанд НӨАТ нэмэгдэхгүй");
    assert.equal(t.tax, 700, "зөвхөн хүргэлтийн НӨАТ");
  });

  test("дэд дүн нь хөнгөлөлтөөр өөрчлөгдөхгүй (баримтад бүтэн дүн үлдэнэ)", () => {
    const t = calculateOrderTotals(50_000, settings(), 2, 5_000);
    assert.equal(t.subtotal, 50_000);
  });

  test("хөнгөлөлт дэд дүнгээс их бол дэд дүнгээр таслагдана (SQL: least(discount, subtotal))", () => {
    const t = calculateOrderTotals(20_000, settings(), 2, 35_000);
    assert.equal(t.discount, 20_000, "мэдээлсэн хөнгөлөлт дэд дүнгээс хэтрэхгүй");
    assert.equal(t.tax, Math.round(t.shipping * 0.1), "хүргэлтийн НӨАТ");
    assert.equal(t.total, t.shipping + t.tax, "хүргэлт + түүний НӨАТ");
  });

  test("сөрөг хөнгөлөлт нийт дүнг НЭМЭГДҮҮЛЖ болохгүй (SQL: greatest(0, …))", () => {
    const t = calculateOrderTotals(30_000, settings(), 3, -5_000);
    assert.equal(t.discount, 0);
    assert.equal(t.total, calculateOrderTotals(30_000, settings(), 3).total);
  });

  test("хөнгөлөлт яг дэд дүнтэй тэнцвэл барааны төлбөр 0", () => {
    const t = calculateOrderTotals(30_000, settings(), 3, 30_000);
    assert.equal(t.total, t.shipping + t.tax);
  });
});

describe("бүхэлчлэл", () => {
  test("хүргэлтийн НӨАТ хамгийн ойрын төгрөгт бүхэлчлэгдэнэ", () => {
    // Багтсан НӨАТ = нийт дүн × 10/110, SQL round-тай ижил
    const s = settings({ shipping_base: 7_005 });
    assert.equal(calculateOrderTotals(30_000, s, 1).tax, 701, "700.5 → 701");
    const s2 = settings({ shipping_base: 7_004 });
    assert.equal(calculateOrderTotals(30_000, s2, 1).tax, 700);
  });

  test("буцаах бүх талбар бүхэл тоо байна", () => {
    const t = calculateOrderTotals(33_333, settings(), 5, 1_111);
    for (const [k, v] of Object.entries(t)) {
      assert.ok(Number.isInteger(v), `${k} бүхэл байх ёстой, гэвч ${v}`);
    }
  });
});
