import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isValidSku, nextSku, normalizeSku } from "./sku.ts";

describe("isValidSku", () => {
  test("VIDAN + гурваас дээш оронтой тоо", () => {
    assert.equal(isValidSku("VIDAN001"), true);
    assert.equal(isValidSku("VIDAN047"), true);
    assert.equal(isValidSku("VIDAN1000"), true);
  });

  test("жижиг үсэг, илүү зайг уучилна — хадгалахдаа цэвэрлэнэ", () => {
    assert.equal(isValidSku(" vidan048 "), true);
    assert.equal(normalizeSku(" vidan048 "), "VIDAN048");
  });

  test("жишигт таарахгүйг хүлээж авахгүй", () => {
    // 2026-10-08-нд "038" гэж орсон бараа дарааллыг эвдсэн
    for (const bad of ["038", "VIDAN", "VIDAN48", "VDN-048", "VIDAN-048", "VIDAN048A", ""]) {
      assert.equal(isValidSku(bad), false, bad);
    }
  });
});

describe("nextSku", () => {
  test("хамгийн их дугаарын дараагийнх", () => {
    assert.equal(nextSku(["VIDAN001", "VIDAN046", "VIDAN047"]), "VIDAN048");
  });

  test("завсрыг нөхөхгүй — устгагдсан барааны дугаар дахин хэрэглэгдэхгүй", () => {
    assert.equal(nextSku(["VIDAN001", "VIDAN003", "VIDAN010"]), "VIDAN011");
  });

  test("жишигт таарахгүй SKU дарааллд нөлөөлөхгүй", () => {
    assert.equal(nextSku(["038", "VDN-999", "VIDAN046"]), "VIDAN047");
  });

  test("дараалал эрэмбээс хамаарахгүй", () => {
    assert.equal(nextSku(["VIDAN047", "VIDAN002", "VIDAN030"]), "VIDAN048");
  });

  test("бараа байхгүй бол 001-ээс эхэлнэ", () => {
    assert.equal(nextSku([]), "VIDAN001");
  });

  test("999-өөс цааш дөрвөн оронтой болно", () => {
    assert.equal(nextSku(["VIDAN999"]), "VIDAN1000");
  });
});
