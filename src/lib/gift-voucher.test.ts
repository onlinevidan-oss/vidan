/**
 * Эрхийн бичгийн админ логикийн тест.
 * ЭТАЛОН нь 0050_gift_voucher.sql (gift_voucher_balance, place_order).
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  VOUCHER_CODE_ALPHABET,
  generateVoucherCode,
  normalizeVoucherCode,
  validateVoucher,
  voucherBalance,
  voucherState,
} from "./gift-voucher.ts";

const TODAY = "2026-11-09";
const ok = { code: "", amount: 200_000, ends_on: "2026-12-31", note: "" };

describe("generateVoucherCode", () => {
  test("8 тэмдэгт, зөвхөн зөвшөөрөгдсөн цагаан толгойгоор", () => {
    const code = generateVoucherCode(new Uint8Array([0, 1, 30, 31, 62, 200, 255, 7]));
    assert.equal(code.length, 8);
    for (const c of code) assert.ok(VOUCHER_CODE_ALPHABET.includes(c), c);
    // DB-ийн check (^[A-Z0-9]{6,20}$)-д таарна
    assert.match(code, /^[A-Z0-9]{6,20}$/);
  });
});

describe("normalizeVoucherCode", () => {
  test("жижиг үсэг, зай, зураасыг цэвэрлэнэ", () => {
    assert.equal(normalizeVoucherCode(" s9tg-r6pp "), "S9TGR6PP");
  });
});

describe("validateVoucher", () => {
  test("зөв утга", () => assert.equal(validateVoucher(ok, TODAY), null));
  test("код хоосон бол автоматаар үүснэ — алдаа биш", () =>
    assert.equal(validateVoucher({ ...ok, code: "" }, TODAY), null));
  test("богино код", () => assert.ok(validateVoucher({ ...ok, code: "AB12" }, TODAY)));
  test("бага / бутархай дүн", () => {
    assert.ok(validateVoucher({ ...ok, amount: 500 }, TODAY));
    assert.ok(validateVoucher({ ...ok, amount: 1_000.5 }, TODAY));
  });
  test("өнгөрсөн огноо", () => assert.ok(validateVoucher({ ...ok, ends_on: "2026-11-08" }, TODAY)));
  test("өнөөдрийг дуустал болно, хугацаагүй ч болно", () => {
    assert.equal(validateVoucher({ ...ok, ends_on: TODAY }, TODAY), null);
    assert.equal(validateVoucher({ ...ok, ends_on: "" }, TODAY), null);
  });
});

describe("voucherBalance", () => {
  test("цуцлагдсан захиалгын хэрэглээ үлдэгдэлд буцна", () => {
    assert.equal(
      voucherBalance(200_000, [
        { amount: 89_500, cancelled: false },
        { amount: 50_000, cancelled: true },
      ]),
      110_500,
    );
  });
});

describe("voucherState", () => {
  const now = new Date("2026-11-09T05:00:00Z");
  test("дараалал: унтраасан → хугацаа → үлдэгдэл", () => {
    assert.equal(voucherState({ is_active: false, ends_at: null, balance: 0 }, now), "off");
    assert.equal(
      voucherState({ is_active: true, ends_at: "2026-11-01T00:00:00Z", balance: 5 }, now),
      "expired",
    );
    assert.equal(voucherState({ is_active: true, ends_at: null, balance: 0 }, now), "empty");
    assert.equal(
      voucherState({ is_active: true, ends_at: "2026-12-31T15:59:59Z", balance: 1 }, now),
      "active",
    );
  });
});
