import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  orderListHref,
  parseOrderListParams,
  safeSearchTerm,
  searchDigits,
} from "./order-list.ts";

describe("parseOrderListParams", () => {
  test("хоосон бол төлөгдсөн захиалгын 1-р хуудас", () => {
    assert.deepEqual(parseOrderListParams({}), {
      view: "paid",
      status: undefined,
      search: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });

  test("мэдэгдэхгүй төлөв, буруу хуудсыг үл тооно", () => {
    const p = parseOrderListParams({ status: "hacked", page: "-3" });
    assert.equal(p.status, undefined);
    assert.equal(p.page, 1);
    assert.equal(parseOrderListParams({ page: "abc" }).page, 1);
    assert.equal(parseOrderListParams({ page: "4" }).page, 4);
  });

  test("төлөгдөөгүй харагдацад төлвийн шүүлтүүр үйлчлэхгүй", () => {
    const p = parseOrderListParams({ view: "unpaid", status: "delivered" });
    assert.equal(p.view, "unpaid");
    assert.equal(p.status, undefined);
  });

  test("байхгүй өдөр, буруу хэлбэрийн огноог хүлээж авахгүй", () => {
    assert.equal(parseOrderListParams({ from: "2026-02-31" }).from, undefined);
    assert.equal(parseOrderListParams({ from: "10/02/2026" }).from, undefined);
    assert.equal(parseOrderListParams({ from: "2026-10-02" }).from, "2026-10-02");
  });

  test("эхлэл төгсгөлөөс хойш бол солино", () => {
    const p = parseOrderListParams({ from: "2026-10-08", to: "2026-10-01" });
    assert.equal(p.from, "2026-10-01");
    assert.equal(p.to, "2026-10-08");
  });

  test("хайлтын үгийг цэвэрлэж, уртыг хязгаарлана", () => {
    assert.equal(parseOrderListParams({ q: "  #10314 " }).search, "#10314");
    assert.equal(parseOrderListParams({ q: "   " }).search, undefined);
    assert.equal(parseOrderListParams({ q: "x".repeat(200) }).search?.length, 60);
  });

  test("давхардсан параметрийн эхнийхийг авна", () => {
    assert.equal(parseOrderListParams({ status: ["new", "cancelled"] }).status, "new");
  });
});

describe("orderListHref", () => {
  const base = parseOrderListParams({ status: "new", q: "8888", page: "3" });

  test("шүүлтүүр солигдоход хуудас 1 рүү буцна", () => {
    assert.equal(
      orderListHref(base, { status: "delivered" }),
      "/admin/orders?status=delivered&q=8888",
    );
  });

  test("хуудас солиход шүүлтүүр хадгалагдана", () => {
    assert.equal(
      orderListHref(base, { page: 4 }),
      "/admin/orders?status=new&q=8888&page=4",
    );
  });

  test("төлөгдөөгүй рүү шилжихэд төлөв арилна, хайлт үлдэнэ", () => {
    assert.equal(
      orderListHref(base, { view: "unpaid" }),
      "/admin/orders?view=unpaid&q=8888",
    );
  });

  test("шүүлтүүргүй бол цэвэр хаяг", () => {
    assert.equal(orderListHref(parseOrderListParams({})), "/admin/orders");
  });

  test("кирилл хайлт хаягт зөв кодлогдоно", () => {
    const href = orderListHref(parseOrderListParams({ q: "Бат Эрдэнэ" }));
    assert.equal(new URL(href, "http://x").searchParams.get("q"), "Бат Эрдэнэ");
  });
});

describe("хайлтын туслах", () => {
  test("дугаар, утаснаас зөвхөн тоог авна", () => {
    assert.equal(searchDigits("#10314"), "10314");
    assert.equal(searchDigits("+976 8888-6174"), "97688886174");
    assert.equal(searchDigits("Бат"), "");
  });

  test("шүүлтүүрийг эвдэх тэмдэгтийг арилгана", () => {
    assert.equal(safeSearchTerm("Бат,id.neq.0)"), "Бат id.neq.0");
    assert.equal(safeSearchTerm("100%_x"), "100 x");
    assert.equal(safeSearchTerm("  Бат   Эрдэнэ "), "Бат Эрдэнэ");
  });
});
