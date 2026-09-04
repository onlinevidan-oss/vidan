/**
 * E-Barimt баримт бүтээх логикийн тест.
 *
 * ГОЛ ШААРДЛАГА: баримтын нийт дүн нь хэрэглэгчийн БОДИТООР ТӨЛСӨН дүнтэй
 * таарах ёстой. Захиалгын дүн pricing.ts-ээр (= DB calc_order_totals) бодогддог
 * тул энд тэр тооцоог давтаж, баримттай тулгана.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allocateOrderDiscount,
  buildReceiptRequest,
  type EbarimtLineItem,
  type EbarimtMerchantConfig,
} from "./build.ts";
import { calculateOrderTotals, COMMERCE_DEFAULTS } from "../pricing.ts";

const MERCHANT: EbarimtMerchantConfig = {
  merchantTin: "12345678",
  districtCode: "3420",
  posNo: "10001234",
  branchNo: "001",
};

function goods(
  over: Partial<EbarimtLineItem> = {},
): EbarimtLineItem {
  return {
    name: "Даршилсан өргөст хэмх",
    classificationCode: "6215900",
    qty: 1,
    unitPrice: 10_000,
    taxType: "VAT_ABLE",
    ...over,
  };
}

describe("allocateOrderDiscount", () => {
  test("хөнгөлөлтгүй бол мөрүүд хэвээр", () => {
    const lines = [goods({ qty: 2 }), goods({ unitPrice: 5_000 })];
    const { lines: out, residual } = allocateOrderDiscount(lines, 0);
    assert.equal(residual, 0);
    assert.deepEqual(
      out.map((l) => l.unitPrice),
      [10_000, 5_000],
    );
  });

  test("харьцаагаар жигд хуваарилагдана", () => {
    // Барааны дүн 50,000; 10% хөнгөлөлт → бүх нэгжийн үнэ 10%-иар буурна
    const lines = [goods({ qty: 2, unitPrice: 20_000 }), goods({ unitPrice: 10_000 })];
    const { lines: out, residual } = allocateOrderDiscount(lines, 5_000);
    assert.deepEqual(
      out.map((l) => l.unitPrice),
      [18_000, 9_000],
    );
    assert.equal(residual, 0);
  });

  test("хуваарилсны дараах дүн = барааны дүн − хөнгөлөлт (үлдэгдлийг тооцвол)", () => {
    const lines = [goods({ qty: 3, unitPrice: 7_777 }), goods({ qty: 2, unitPrice: 3_333 })];
    const goodsTotal = 3 * 7_777 + 2 * 3_333;
    const discount = 4_321;
    const { lines: out, residual } = allocateOrderDiscount(lines, discount);
    const after = out.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    assert.equal(after + residual, goodsTotal - discount);
  });

  test("үлдэгдэл нь зөвхөн бүхэлчлэлийн хэмжээнд байна", () => {
    // Мөр бүрд ихдээ (qty − 1)₮ зөрөх боломжтой; хэмжээ нь мөрийн тооноос хамаарна
    const lines = [goods({ qty: 3, unitPrice: 7_777 }), goods({ qty: 2, unitPrice: 3_333 })];
    const { residual } = allocateOrderDiscount(lines, 4_321);
    const maxDrift = lines.reduce((s, l) => s + l.qty, 0);
    assert.ok(
      Math.abs(residual) <= maxDrift,
      `үлдэгдэл ${residual}₮ хэт том (дээд хязгаар ${maxDrift}₮)`,
    );
  });

  test("хөнгөлөлт барааны дүнгээс их бол дүнгээр таслагдана", () => {
    const lines = [goods({ unitPrice: 10_000 })];
    const { lines: out } = allocateOrderDiscount(lines, 99_000);
    assert.equal(out[0].unitPrice, 0);
  });

  test("сөрөг хөнгөлөлт үнийг НЭМЭГДҮҮЛЭХГҮЙ", () => {
    const lines = [goods({ unitPrice: 10_000 })];
    const { lines: out, residual } = allocateOrderDiscount(lines, -5_000);
    assert.equal(out[0].unitPrice, 10_000);
    assert.equal(residual, 0);
  });

  test("оролтын массивыг өөрчлөхгүй (шинэ объект буцаана)", () => {
    const lines = [goods({ unitPrice: 10_000 })];
    allocateOrderDiscount(lines, 1_000);
    assert.equal(lines[0].unitPrice, 10_000, "эх мөр хэвээр байх ёстой");
  });
});

describe("buildReceiptRequest", () => {
  test("НӨАТ нь мөрийн цэвэр дүнгийн 10%, totalAmount дээр нь нэмэгдэнэ", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods({ qty: 2, unitPrice: 10_000 })],
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    assert.equal(req.totalVAT, 2_000);
    assert.equal(req.totalAmount, 22_000);
    assert.equal(req.receipts[0].items[0].unitPrice, 10_000, "нэгжийн үнэ цэвэр дүн");
  });

  test("NO_VAT мөр НӨАТ төлүүлэхгүй", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods({ taxType: "NO_VAT", unitPrice: 7_000, name: "Хүргэлт" })],
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    assert.equal(req.totalVAT, 0);
    assert.equal(req.totalAmount, 7_000);
  });

  test("татварын төрөл тус бүрд тусдаа дэд баримт үүснэ", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods(), goods({ taxType: "NO_VAT", name: "Хүргэлт", unitPrice: 7_000 })],
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    assert.equal(req.receipts.length, 2);
    assert.deepEqual(
      req.receipts.map((r) => r.taxType).sort(),
      ["NO_VAT", "VAT_ABLE"],
    );
  });

  test("нийт дүн нь дэд баримтуудын нийлбэртэй тэнцэнэ", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods({ qty: 3 }), goods({ taxType: "NO_VAT", unitPrice: 7_000 })],
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    const sum = req.receipts.reduce((s, r) => s + r.totalAmount, 0);
    assert.equal(req.totalAmount, sum);
  });

  test("B2C баримтад consumerNo үлдэж, customerTin хоосон", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods()],
      consumerNo: "УБ12345678",
      customerTin: "99999999",
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    assert.equal(req.consumerNo, "УБ12345678");
    assert.equal(req.customerTin, null);
  });

  test("B2B баримтад ТТД байхгүй бол алдаа шиднэ", () => {
    assert.throws(
      () =>
        buildReceiptRequest({
          type: "B2B_RECEIPT",
          items: [goods()],
          payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
          merchant: MERCHANT,
        }),
      /ТТД/,
    );
  });

  test("barCode байхгүй бол barCodeType нь UNDEFINED", () => {
    const req = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: [goods()],
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    assert.equal(req.receipts[0].items[0].barCodeType, "UNDEFINED");
  });
});

/**
 * ХАМГИЙН ЧУХАЛ ТЕСТ — баримтын дүн ба захиалгын дүн зөрөхгүй байх.
 * Захиалгыг pricing.ts-ээр бодож, яг тэр захиалгаас баримт угсарна.
 */
describe("баримтын дүн ↔ захиалгын дүн", () => {
  /** Захиалгыг баримт болгох — createOrderEbarimt дэх дараалалтай ижил */
  function receiptForOrder(
    items: { qty: number; unitPrice: number }[],
    discount: number,
  ) {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const itemCount = items.reduce((s, i) => s + i.qty, 0);
    const order = calculateOrderTotals(subtotal, COMMERCE_DEFAULTS, itemCount, discount);

    const { lines } = allocateOrderDiscount(
      items.map((i) => goods({ qty: i.qty, unitPrice: i.unitPrice })),
      discount,
    );
    const receiptLines: EbarimtLineItem[] = [...lines];
    if (order.shipping > 0) {
      receiptLines.push(
        goods({ name: "Хүргэлт", qty: 1, unitPrice: order.shipping, taxType: "NO_VAT" }),
      );
    }
    const receipt = buildReceiptRequest({
      type: "B2C_RECEIPT",
      items: receiptLines,
      payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
      merchant: MERCHANT,
    });
    return { order, receipt };
  }

  test("хөнгөлөлтгүй захиалгад дүн ЯГ таарна", () => {
    const { order, receipt } = receiptForOrder(
      [{ qty: 2, unitPrice: 15_000 }, { qty: 1, unitPrice: 20_000 }],
      0,
    );
    assert.equal(receipt.totalAmount, order.total);
    assert.equal(receipt.totalVAT, order.tax);
  });

  test("хөнгөлөлттэй захиалгад дүн таарна (жигд хуваагдах тохиолдол)", () => {
    // 50,000 барааны дүн, 10% промо → мөр бүр жигд буурна
    const { order, receipt } = receiptForOrder(
      [{ qty: 2, unitPrice: 20_000 }, { qty: 1, unitPrice: 10_000 }],
      5_000,
    );
    assert.equal(receipt.totalAmount, order.total);
    assert.equal(receipt.totalVAT, order.tax);
  });

  test("жигд хуваагдахгүй үед ч зөрүү нь бүхэлчлэлийн хэмжээнд л байна", () => {
    const items = [{ qty: 3, unitPrice: 7_777 }, { qty: 2, unitPrice: 3_333 }];
    const { order, receipt } = receiptForOrder(items, 4_321);
    const drift = Math.abs(receipt.totalAmount - order.total);
    const maxDrift = items.reduce((s, i) => s + i.qty, 0) * 2; // цэвэр дүн + НӨАТ
    assert.ok(
      drift <= maxDrift,
      `баримт ${receipt.totalAmount}₮ ба захиалга ${order.total}₮ хооронд ${drift}₮ зөрүү — хэт том`,
    );
  });

  test("хүргэлт баримтад НӨАТ-гүй мөр болж орно", () => {
    const { order, receipt } = receiptForOrder([{ qty: 2, unitPrice: 15_000 }], 0);
    const shippingLine = receipt.receipts
      .flatMap((r) => r.items)
      .find((i) => i.name === "Хүргэлт");
    assert.ok(shippingLine, "хүргэлтийн мөр байх ёстой");
    assert.equal(shippingLine.totalVAT, 0);
    assert.equal(shippingLine.totalAmount, order.shipping);
  });
});
