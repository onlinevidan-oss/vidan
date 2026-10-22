/**
 * describeProductChange — ажилтны түүхэнд "юу өөрчлөгдсөн"-ийг бичих.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { describeProductChange } from "./staff-activity-text.ts";

const base = { name_mn: "Өргөст хэмх 720г", price: 6_200, old_price: null, is_active: true };

describe("describeProductChange", () => {
  test("үнэ ба идэвх өөрчлөгдвөл хоёуланг нь бичнэ", () => {
    assert.equal(
      describeProductChange(base, { ...base, price: 6_500, is_active: false }),
      "Өргөст хэмх 720г — үнэ 6,200₮ → 6,500₮; идэвхгүй болгосон",
    );
  });

  test("хуучин (зураастай) үнэ нэмсэн", () => {
    assert.equal(
      describeProductChange(base, { ...base, old_price: 6_900 }),
      "Өргөст хэмх 720г — хуучин үнэ — → 6,900₮",
    );
  });

  test("нэр солигдвол хуучин, шинэ нэрийг хоёуланг нь", () => {
    assert.equal(
      describeProductChange(base, { ...base, name_mn: "Өргөст хэмх 750г" }),
      "Өргөст хэмх 750г — нэр «Өргөст хэмх 720г» → «Өргөст хэмх 750г»",
    );
  });

  test("гол талбар өөрчлөгдөөгүй бол зөвхөн нэр", () => {
    assert.equal(describeProductChange(base, { ...base }), "Өргөст хэмх 720г");
  });

  test("өмнөх утга олдоогүй бол нэр", () => {
    assert.equal(describeProductChange(null, base), "Өргөст хэмх 720г");
  });

  test("сангаас мөр (string) ирсэн тоог ч зөв харьцуулна", () => {
    const fromDb = { ...base, price: "6200" as unknown as number };
    assert.equal(describeProductChange(fromDb, base), "Өргөст хэмх 720г");
  });
});
