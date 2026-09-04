/**
 * ebarimtDisplayFromOrder — хэрэглэгчид ХАРАГДАХ баримтын тест.
 *
 * АЛДАА БАЙСАН: энэ функц orders.discount-ыг үл тоож, order_items.unit_price
 * (хөнгөлөлтийн ӨМНӨХ үнэ)-ээр баримт угсардаг байв. Улмаар промо код
 * хэрэглэсэн захиалгад хэрэглэгч бодитоор төлсөн дүнгээсээ ӨНДӨР дүнтэй
 * баримт хардаг — PosAPI руу илгээгдсэн баримттай ч зөрдөг байсан.
 *
 * Доорх тестүүд тэр зөрүүг хаана.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ebarimtDisplayFromOrder } from "./display.ts";
import { calculateOrderTotals, COMMERCE_DEFAULTS } from "../pricing.ts";

type Order = Parameters<typeof ebarimtDisplayFromOrder>[0];

/** Баримт үүссэн захиалга — pricing.ts-ээр бодсон бодит дүнтэй */
function orderFrom(
  items: { product_name: string; quantity: number; unit_price: number }[],
  discount = 0,
  over: Partial<Order> = {},
) {
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const t = calculateOrderTotals(subtotal, COMMERCE_DEFAULTS, itemCount, discount);
  const order: Order = {
    ebarimt_id: "0001234567890123",
    ebarimt_date: "2026-09-03 12:00:00",
    ebarimt_type: "B2C_RECEIPT",
    ebarimt_lottery: "AB12345678",
    ebarimt_qr: "QRDATA",
    tax: t.tax,
    total: t.total,
    shipping: t.shipping,
    discount: t.discount,
    ...over,
  };
  return { order, items, totals: t };
}

describe("баримт байхгүй үе", () => {
  test("ebarimt_id байхгүй бол null", () => {
    const { order, items } = orderFrom([{ product_name: "Нухаш", quantity: 1, unit_price: 30_000 }]);
    assert.equal(ebarimtDisplayFromOrder({ ...order, ebarimt_id: null }, items), null);
  });

  test("QR байхгүй бол null", () => {
    const { order, items } = orderFrom([{ product_name: "Нухаш", quantity: 1, unit_price: 30_000 }]);
    assert.equal(ebarimtDisplayFromOrder({ ...order, ebarimt_qr: null }, items), null);
  });
});

describe("хөнгөлөлтгүй захиалга", () => {
  const { order, items, totals } = orderFrom([
    { product_name: "Алимны нухаш", quantity: 2, unit_price: 15_000 },
    { product_name: "Өргөст хэмх", quantity: 1, unit_price: 20_000 },
  ]);
  const r = ebarimtDisplayFromOrder(order, items)!;

  test("баримтын дүн = захиалгын нийт дүн", () => {
    assert.equal(r.totalAmount, totals.total);
  });

  test("баримтын НӨАТ = захиалгын НӨАТ", () => {
    assert.equal(r.totalVAT, totals.tax);
  });

  test("хүргэлт тусдаа мөр болж, НӨАТ төлүүлэхгүй", () => {
    const ship = r.receipts[0].items.find((i) => i.name === "Хүргэлтийн үйлчилгээ");
    assert.ok(ship);
    assert.equal(ship.totalAmount, totals.shipping);
    assert.equal(ship.totalVAT, 0);
  });

  test("сугалаа ба QR дамжина", () => {
    assert.equal(r.lottery, "AB12345678");
    assert.equal(r.qrData, "QRDATA");
  });
});

describe("промо хөнгөлөлттэй захиалга", () => {
  // 50,000₮ бараа, 5,000₮ (10%) промо
  const { order, items, totals } = orderFrom(
    [
      { product_name: "Алимны нухаш", quantity: 2, unit_price: 20_000 },
      { product_name: "Өргөст хэмх", quantity: 1, unit_price: 10_000 },
    ],
    5_000,
  );
  const r = ebarimtDisplayFromOrder(order, items)!;

  test("баримтын дүн нь ТӨЛСӨН дүнтэй таарна (хөнгөлөлтийн өмнөх дүн БИШ)", () => {
    assert.equal(r.totalAmount, totals.total);
  });

  test("хөнгөлөлтгүй бодсон дүнгээс бага байна", () => {
    const noDiscount = ebarimtDisplayFromOrder({ ...order, discount: 0 }, items)!;
    assert.ok(
      r.totalAmount < noDiscount.totalAmount,
      "хөнгөлөлт баримтад тусаагүй байна",
    );
  });

  test("нэгжийн үнэ харьцаагаар буурсан байна", () => {
    const line = r.receipts[0].items.find((i) => i.name === "Алимны нухаш");
    assert.ok(line);
    assert.equal(line.unitPrice, 18_000, "20,000₮ − 10%");
  });

  test("хүргэлтэд хөнгөлөлт хамаарахгүй", () => {
    const ship = r.receipts[0].items.find((i) => i.name === "Хүргэлтийн үйлчилгээ");
    assert.ok(ship);
    assert.equal(ship.unitPrice, totals.shipping);
  });

  test("дэд баримтын дүн нь толгойн дүнтэй тэнцэнэ", () => {
    assert.equal(r.receipts[0].totalAmount, r.totalAmount);
    assert.equal(r.receipts[0].totalVAT, r.totalVAT);
  });
});

describe("хүргэлт үнэгүй үе", () => {
  test("хүргэлт 0 бол баримтад мөр нэмэгдэхгүй", () => {
    const { order, items } = orderFrom([
      { product_name: "Нухаш", quantity: 1, unit_price: 30_000 },
    ]);
    const r = ebarimtDisplayFromOrder({ ...order, shipping: 0 }, items)!;
    assert.ok(!r.receipts[0].items.some((i) => i.name === "Хүргэлтийн үйлчилгээ"));
  });
});
