import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ebarimtCheck, parseReceiptAmounts, summarizeEbarimt } from "./check.ts";

describe("parseReceiptAmounts", () => {
  test("QPay-ийн GET хариу — дүн мөр хэлбэрээр, төлөв barimt_status", () => {
    // 2026-10-15: #10315-ийн жинхэнэ хариунаас
    assert.deepEqual(
      parseReceiptAmounts({
        amount: "93400.00",
        vat_amount: "8490.9090",
        city_tax_amount: "0.0000",
        barimt_status: "REGISTERED",
      }),
      { amount: 93400, vat: 8490.909, cityTax: 0, status: "REGISTERED" },
    );
  });

  test("create хариу — төлөв ebarimt_status, дүн тоо хэлбэрээр", () => {
    assert.deepEqual(
      parseReceiptAmounts({ amount: 100, vat_amount: 9.09, ebarimt_status: "REGISTERED" }),
      { amount: 100, vat: 9.09, cityTax: null, status: "REGISTERED" },
    );
  });

  test("дутуу, буруу утгыг null болгоно — зохиохгүй", () => {
    assert.deepEqual(parseReceiptAmounts({ amount: "", vat_amount: "abc" }), {
      amount: null,
      vat: null,
      cityTax: null,
      status: null,
    });
    assert.deepEqual(parseReceiptAmounts(null), {
      amount: null,
      vat: null,
      cityTax: null,
      status: null,
    });
  });
});

describe("ebarimtCheck", () => {
  test("баримтын дүн төлсөн дүнтэй таарвал ok", () => {
    assert.equal(ebarimtCheck({ total: 93400, ebarimt_id: "x", ebarimt_amount: 93400 }), "ok");
    assert.equal(ebarimtCheck({ total: 93400, ebarimt_id: "x", ebarimt_amount: 93400.4 }), "ok");
  });

  test("зөрүүтэй бол mismatch", () => {
    assert.equal(ebarimtCheck({ total: 93400, ebarimt_id: "x", ebarimt_amount: 92000 }), "mismatch");
    assert.equal(ebarimtCheck({ total: 93400, ebarimt_id: "x", ebarimt_amount: 93401 }), "mismatch");
  });

  test("дүнг аваагүй бол unchecked, баримтгүй бол missing", () => {
    assert.equal(ebarimtCheck({ total: 1, ebarimt_id: "x", ebarimt_amount: null }), "unchecked");
    assert.equal(ebarimtCheck({ total: 1, ebarimt_id: null, ebarimt_amount: null }), "missing");
  });
});

describe("summarizeEbarimt", () => {
  test("төлөв бүрээр тоолж, баримтын дүн ба НӨАТ-ыг нэмнэ", () => {
    const s = summarizeEbarimt([
      { total: 9950, ebarimt_id: "a", ebarimt_amount: 9950, ebarimt_vat: 904.5454 },
      { total: 30100, ebarimt_id: "b", ebarimt_amount: 30100, ebarimt_vat: 2736.3635 },
      { total: 500, ebarimt_id: "c", ebarimt_amount: 400, ebarimt_vat: 36.36 },
      { total: 700, ebarimt_id: "d", ebarimt_amount: null, ebarimt_vat: null },
      { total: 800, ebarimt_id: null, ebarimt_amount: null, ebarimt_vat: null },
    ]);
    assert.deepEqual(s, {
      orders: 5,
      withReceipt: 4,
      ok: 2,
      mismatch: 1,
      unchecked: 1,
      missing: 1,
      receiptTotal: 9950 + 30100 + 400,
      vatTotal: 3677.27,
    });
  });
});
