/**
 * Нэхэмжлэлийн имэйлийн загвар (0052). Ажиллуулах: pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { invoiceEmailHtml, invoiceEmailSubject, invoiceEmailText } from "./invoice-email.ts";

const input = {
  no: "10350",
  orderNumber: "#10350",
  orgName: "Тест <ХХК>",
  orgTin: "6169287",
  createdDate: "2026.11.17",
  due: "2026.11.18 14:00",
  lines: [
    { name: "Өргөст хэмх 720г", code: "2111111", unit: "ш", quantity: 2, unitPrice: 6_900, amount: 13_800 },
    { name: "Хүргэлтийн үйлчилгээ", code: "", unit: "удаа", quantity: 1, unitPrice: 7_700, amount: 7_700 },
  ],
  net: 19_545.45,
  vat: 1_954.55,
  total: 21_500,
  qpayUrl: "https://s.qpay.mn/abc",
  qrCid: "qpay-qr",
  invoiceUrl: "https://www.vidan.mn/invoice/x",
};

describe("invoiceEmail", () => {
  test("гарчиг", () => assert.equal(invoiceEmailSubject(input), "VIDAN — Нэхэмжлэх №10350 (21,500₮)"));
  test("HTML-д гол мэдээлэл орно, нэр escape хийгдэнэ", () => {
    const h = invoiceEmailHtml(input);
    for (const s of ["НЭХЭМЖЛЭХ №10350", "5753033556", "MN850005005753033556", "21,500", "1,954.55",
      "хорин нэг мянга таван зуун төгрөг", "cid:qpay-qr", "https://s.qpay.mn/abc", "24 цагийн дотор", "2026.11.18 14:00"]) {
      assert.ok(h.includes(s), s);
    }
    assert.ok(h.includes("Тест &lt;ХХК&gt;"));
    assert.ok(!h.includes("Тест <ХХК>"));
  });
  test("QR, QPay холбоосгүй үед", () => {
    const h = invoiceEmailHtml({ ...input, qpayUrl: null, qrCid: null });
    assert.ok(!h.includes("cid:"));
    assert.ok(!h.includes("QPay) төлөх"));
  });
  test("текст хувилбар", () => {
    const t = invoiceEmailText(input);
    assert.ok(t.includes("Гүйлгээний утга: 10350 6169287"));
    assert.ok(t.includes("1. Өргөст хэмх 720г — 2 × 6,900 = 13,800₮"));
  });
});
