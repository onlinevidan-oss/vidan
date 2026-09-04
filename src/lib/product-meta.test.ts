/**
 * getProductTag — картан дээрх тэмдэглэгээ (хямдрал / ШИНЭ / BIO).
 *
 * Хямдралын хувь нь хэрэглэгчид харагдах ЦОРЫН ГАНЦ хувь тул буруу бол
 * шууд гомдол болно. Хямдралын кампанит ажил old_price-ыг бөглөж
 * ажилладаг (0020_sale_campaign.sql).
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getProductTag, getProductMeta } from "./product-meta.ts";

function product(over: Partial<Parameters<typeof getProductTag>[0]> = {}) {
  return { is_new: false, is_bio: false, old_price: null, price: 10_000, ...over };
}

describe("getProductTag — хямдрал", () => {
  test("old_price өндөр бол хямдралын хувийг харуулна", () => {
    const t = getProductTag(product({ old_price: 10_000, price: 9_000 }));
    assert.deepEqual(t, { tag: "discount", tagText: "−10%" });
  });

  test("кампанит ажлын 10% хямдрал зөв тоологдоно", () => {
    // sync_sale_campaign: price = round(old * 0.9)
    const old = 13_500;
    const t = getProductTag(product({ old_price: old, price: Math.round(old * 0.9) }));
    assert.equal(t.tagText, "−10%");
  });

  test("хувь хамгийн ойрын бүхэл тоо болж бүхэлчлэгдэнэ", () => {
    // 10,000 → 6,667 нь 33.33% → 33%
    const t = getProductTag(product({ old_price: 10_000, price: 6_667 }));
    assert.equal(t.tagText, "−33%");
  });

  test("хямдрал нь ШИНЭ ба BIO-гоос давуу", () => {
    const t = getProductTag(
      product({ old_price: 10_000, price: 8_000, is_new: true, is_bio: true }),
    );
    assert.equal(t.tag, "discount");
  });

  test("old_price нь үнэтэй тэнцүү бол хямдрал биш", () => {
    const t = getProductTag(product({ old_price: 10_000, price: 10_000, is_new: true }));
    assert.equal(t.tag, "new");
  });

  test("old_price нь үнээс бага бол (буруу өгөгдөл) хямдрал гэж үзэхгүй", () => {
    const t = getProductTag(product({ old_price: 8_000, price: 10_000 }));
    assert.equal(t.tag, null);
  });

  test("old_price 0 эсвэл null бол хямдрал биш", () => {
    assert.equal(getProductTag(product({ old_price: 0 })).tag, null);
    assert.equal(getProductTag(product({ old_price: null })).tag, null);
  });
});

describe("getProductTag — ШИНЭ ба BIO", () => {
  test("ШИНЭ нь BIO-гоос түрүүнд", () => {
    const t = getProductTag(product({ is_new: true, is_bio: true }));
    assert.deepEqual(t, { tag: "new", tagText: "ШИНЭ" });
  });

  test("зөвхөн BIO", () => {
    assert.deepEqual(getProductTag(product({ is_bio: true })), {
      tag: "bio",
      tagText: "BIO",
    });
  });

  test("аль нь ч биш бол тэмдэглэгээгүй", () => {
    assert.deepEqual(getProductTag(product()), { tag: null, tagText: null });
  });
});

describe("getProductMeta", () => {
  test("мэдэгдэх SKU-д өөрийн emoji", () => {
    assert.equal(getProductMeta("VDN-001").emoji, "🥒");
  });

  test("үл мэдэгдэх SKU-д fallback буцаана", () => {
    const m = getProductMeta("БАЙХГҮЙ-SKU");
    assert.equal(m.emoji, "🫙");
    assert.ok(m.bg.length > 0);
  });
});
