import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePromoCode,
  promoState,
  validatePromo,
  type PromoInput,
} from "./promo.ts";

const ok: PromoInput = {
  code: "NAMAR10",
  name: "Намрын урамшуулал",
  type: "percent",
  value: 10,
  min_order: 20000,
  max_discount: 30000,
  segment: "all",
  starts_on: "2026-10-08",
  ends_on: "2026-10-31",
  usage_limit: 100,
  usage_per_user: 1,
  is_active: true,
};

describe("normalizePromoCode", () => {
  test("том үсэг болгож, зай, тэмдэгтийг арилгана", () => {
    assert.equal(normalizePromoCode(" namar-10 "), "NAMAR10");
    assert.equal(normalizePromoCode("vip 5k"), "VIP5K");
  });

  test("кирилл үсэг кодод орохгүй — checkout дээр бичихэд төвөгтэй", () => {
    assert.equal(normalizePromoCode("НАМАР10"), "10");
  });
});

describe("validatePromo", () => {
  test("зөв утгад алдаагүй", () => {
    assert.equal(validatePromo(ok), null);
    assert.equal(validatePromo({ ...ok, ends_on: "", usage_limit: null, usage_per_user: null, max_discount: null }), null);
  });

  test("код 3–20 тэмдэгт, латин үсэг ба тоо", () => {
    for (const code of ["AB", "namar10", "NAMAR 10", "НАМАР", "A".repeat(21), ""]) {
      assert.match(validatePromo({ ...ok, code }) ?? "", /Код/, code);
    }
  });

  test("хувь 1–100 бүхэл", () => {
    for (const value of [0, 101, -5, 12.5, NaN]) {
      assert.match(validatePromo({ ...ok, value }) ?? "", /Хувь/, String(value));
    }
    assert.equal(validatePromo({ ...ok, value: 100 }), null);
  });

  test("тогтмол дүн 100₮-өөс багагүй, доод дүнгээс ихгүй", () => {
    const fixed = { ...ok, type: "fixed" as const, max_discount: null };
    assert.match(validatePromo({ ...fixed, value: 50 }) ?? "", /100₮/);
    // 5,000₮ хөнгөлөлт 3,000₮-ийн захиалгад — бараг үнэгүй болно
    assert.match(validatePromo({ ...fixed, value: 5000, min_order: 3000 }) ?? "", /доод дүн/);
    assert.equal(validatePromo({ ...fixed, value: 5000, min_order: 20000 }), null);
  });

  test("сөрөг доод дүн, 0 дээд хязгаарыг хүлээж авахгүй", () => {
    assert.match(validatePromo({ ...ok, min_order: -1 }) ?? "", /доод дүн/);
    assert.match(validatePromo({ ...ok, max_discount: 0 }) ?? "", /дээд хязгаар/);
  });

  test("дуусах огноо эхлэхээс өмнө байж болохгүй", () => {
    assert.match(validatePromo({ ...ok, ends_on: "2026-10-01" }) ?? "", /өмнө/);
    assert.equal(validatePromo({ ...ok, ends_on: ok.starts_on }), null);
    assert.match(validatePromo({ ...ok, starts_on: "" }) ?? "", /Эхлэх/);
  });

  test("ашиглах тоо 1-ээс багагүй", () => {
    assert.match(validatePromo({ ...ok, usage_limit: 0 }) ?? "", /Нийт/);
    assert.match(validatePromo({ ...ok, usage_per_user: 0 }) ?? "", /Нэг хэрэглэгч/);
  });

  test("дэмжигдээгүй төрлийг үүсгэхгүй", () => {
    assert.match(validatePromo({ ...ok, type: "bogo" as never }) ?? "", /төрөл/);
  });
});

describe("promoState", () => {
  const now = new Date("2026-10-08T04:00:00Z");
  const base = {
    type: "percent",
    is_active: true,
    starts_at: "2026-10-01T00:00:00Z",
    ends_at: "2026-10-31T00:00:00Z",
    usage_limit: 100,
    usage_count: 3,
  };

  test("нөхцөл бүгд хангагдвал идэвхтэй", () => {
    assert.equal(promoState(base, now), "active");
    assert.equal(promoState({ ...base, ends_at: null, usage_limit: null }, now), "active");
  });

  test("унтраасан, эхлээгүй, дууссан, дүүрсэн", () => {
    assert.equal(promoState({ ...base, is_active: false }, now), "off");
    assert.equal(promoState({ ...base, starts_at: "2026-10-09T00:00:00Z" }, now), "scheduled");
    assert.equal(promoState({ ...base, ends_at: "2026-10-07T00:00:00Z" }, now), "expired");
    assert.equal(promoState({ ...base, usage_count: 100 }, now), "used_up");
  });

  test("validate_promo дэмждэггүй төрөл идэвхтэй байсан ч ажиллахгүй", () => {
    // Анхны жишээ өгөгдлийн JAM2025 (bogo)
    assert.equal(promoState({ ...base, type: "bogo" }, now), "unsupported");
    assert.equal(promoState({ ...base, type: "free_shipping" }, now), "unsupported");
  });
});
