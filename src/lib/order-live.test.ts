import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { becamePaid } from "./order-live.ts";

describe("becamePaid", () => {
  test("хүлээгдэж байснаас төлөгдсөн болсон — мэдэгдэнэ", () => {
    assert.equal(becamePaid({ payment_status: "paid" }, { payment_status: "pending" }, false), true);
  });

  test("аль хэдийн төлөгдсөн захиалгын төлөв солигдоход мэдэгдэхгүй", () => {
    // бэлтгэж байна → жолоочид: payment_status хоёр талд "paid"
    assert.equal(becamePaid({ payment_status: "paid" }, { payment_status: "paid" }, false), false);
    assert.equal(becamePaid({ payment_status: "paid" }, { payment_status: "paid" }, true), false);
  });

  test("old мөр зөвхөн id-тай ирэхэд мэдэж байсан төлвөөр шийднэ", () => {
    // RLS-тэй хүснэгтэд Realtime old-ийг бүрэн өгөхгүй байж болно
    assert.equal(becamePaid({ payment_status: "paid" }, {}, true), true);
    assert.equal(becamePaid({ payment_status: "paid" }, {}, false), false);
    assert.equal(becamePaid({ payment_status: "paid" }, null, true), true);
    assert.equal(becamePaid({ payment_status: "paid" }, undefined, false), false);
  });

  test("төлөгдөөгүй өөрчлөлтөд мэдэгдэхгүй", () => {
    assert.equal(becamePaid({ payment_status: "pending" }, { payment_status: "pending" }, true), false);
    assert.equal(becamePaid({ payment_status: "failed" }, { payment_status: "pending" }, true), false);
    assert.equal(becamePaid({}, {}, true), false);
  });
});
