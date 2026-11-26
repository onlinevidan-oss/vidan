/**
 * Байгууллагын нэхэмжлэлийн (0052) цэвэр логикийн тест.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords,
  buildInvoiceLines,
  invoiceNumber,
  invoiceState,
  invoiceTimeLeft,
  validateOrgName,
  validateOrgTin,
  validateInvoiceEmail,
} from "./invoice.ts";

describe("amountInWords", () => {
  test("загварын жишээ", () =>
    assert.equal(amountInWords(650_000), "зургаан зуун тавин мянган төгрөг"));
  test("мянга араасаа тоо авбал 'мянга'", () => {
    assert.equal(amountInWords(7_700), "долоон мянга долоон зуун төгрөг");
    assert.equal(amountInWords(21_095), "хорин нэг мянга ерэн таван төгрөг");
  });
  test("сая", () => {
    assert.equal(
      amountInWords(1_234_567),
      "нэг сая хоёр зуун гучин дөрвөн мянга таван зуун жаран долоон төгрөг",
    );
    assert.equal(amountInWords(2_000_000), "хоёр сая төгрөг");
    assert.equal(amountInWords(3_000_500), "гурван сая таван зуун төгрөг");
  });
  test("жижиг дүн, тэг", () => {
    assert.equal(amountInWords(10), "арван төгрөг");
    assert.equal(amountInWords(105), "нэг зуун таван төгрөг");
    assert.equal(amountInWords(1_000), "нэг мянган төгрөг");
    assert.equal(amountInWords(0), "тэг төгрөг");
  });
});

describe("buildInvoiceLines", () => {
  const base = {
    discount: 0,
    shipping: 7_000,
    tax: 700,
    total: 52_825 + 0, // доор дахин тооцно
    voucher_amount: 0,
    items: [
      { product_name: "Өргөст хэмх 720г", code: "2111111", quantity: 5, unit_price: 6_900, subtotal: 34_500 },
      { product_name: "Мангас өргөст хэмх 720г", code: null, quantity: 2, unit_price: 7_500, subtotal: 15_000 },
    ],
  };

  test("бараа + хүргэлт (НӨАТ-тай нь) = нийт", () => {
    const o = { ...base, total: 34_500 + 15_000 + 7_700 };
    const r = buildInvoiceLines(o);
    assert.equal(r.matchesTotal, true);
    assert.equal(r.lines.length, 3);
    assert.deepEqual(r.lines[2], {
      name: "Хүргэлтийн үйлчилгээ", code: "", unit: "удаа", quantity: 1, unitPrice: 7_700, amount: 7_700,
    });
    assert.equal(r.lines[1].code, "");
  });

  test("хөнгөлөлт, эрхийн бичиг хасах мөрөөр", () => {
    const o = { ...base, discount: 2_475, voucher_amount: 10_000, total: 49_500 - 2_475 + 7_700 - 10_000 };
    const r = buildInvoiceLines(o);
    assert.equal(r.matchesTotal, true);
    assert.equal(r.lines.find((l) => l.name === "Хөнгөлөлт")?.amount, -2_475);
    assert.equal(r.lines.find((l) => l.name === "Эрхийн бичиг")?.amount, -10_000);
  });

  test("үнэгүй хүргэлттэй бол хүргэлтийн мөр гарахгүй", () => {
    const o = { ...base, shipping: 0, tax: 0, total: 49_500 };
    const r = buildInvoiceLines(o);
    assert.equal(r.lines.length, 2);
    assert.equal(r.matchesTotal, true);
  });

  test("зөрвөл matchesTotal = false", () => {
    assert.equal(buildInvoiceLines({ ...base, total: 1 }).matchesTotal, false);
  });
});

describe("invoiceNumber", () => {
  test("цифр л үлдэнэ", () => assert.equal(invoiceNumber("#10350"), "10350"));
});

describe("validateOrgTin / validateOrgName", () => {
  test("РД", () => {
    assert.equal(validateOrgTin("6169287"), null);
    assert.equal(validateOrgTin("12345678901"), null);
    assert.ok(validateOrgTin(""));
    assert.ok(validateOrgTin("12345"));
    assert.ok(validateOrgTin("АБ123456"));
  });
  test("нэр", () => {
    assert.equal(validateOrgName("Сэнтрал фүүдс ХХК"), null);
    assert.ok(validateOrgName(" "));
    assert.ok(validateOrgName("x".repeat(201)));
  });
});

describe("invoiceState / invoiceTimeLeft", () => {
  test("төлөв", () => {
    assert.equal(invoiceState({ payment_status: "paid", status: "new" }), "paid");
    assert.equal(invoiceState({ payment_status: "failed", status: "cancelled" }), "cancelled");
    assert.equal(invoiceState({ payment_status: "pending", status: "new" }), "unconfirmed");
  });
  test("үлдсэн хугацаа", () => {
    const now = new Date("2026-11-17T06:00:00Z");
    assert.equal(invoiceTimeLeft("2026-11-18T05:10:00Z", now), "23ц 10м");
    assert.equal(invoiceTimeLeft("2026-11-17T06:45:00Z", now), "45м");
    assert.equal(invoiceTimeLeft("2026-11-17T05:00:00Z", now), null);
    assert.equal(invoiceTimeLeft(null, now), null);
  });
});

describe("validateInvoiceEmail", () => {
  test("зөв / буруу", () => {
    assert.equal(validateInvoiceEmail("nyagtlan@company.mn"), null);
    assert.equal(validateInvoiceEmail("  a.b+c@gmail.com "), null);
    assert.ok(validateInvoiceEmail(""));
    assert.ok(validateInvoiceEmail("abc"));
    assert.ok(validateInvoiceEmail("a@b"));
    assert.ok(validateInvoiceEmail("a b@c.mn"));
  });
});
