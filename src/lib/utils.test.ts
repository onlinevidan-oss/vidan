/**
 * slugify / formatPhone / formatMnt тест.
 *
 * slugify нь бодит алдаа гаргаж байсан: кирилл нэртэй шинэ бараа үүсгэхэд
 * URL нь латин болж хөрвөхгүй, барааны хуудас 404 өгдөг байв
 * (commit 3864875). Тиймээс хөрвүүлэлтийг үсэг бүрээр нь бэхэлж байна.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { slugify, formatPhone, formatMnt } from "./utils.ts";

describe("slugify", () => {
  test("кирилл нэрийг латин slug болгоно", () => {
    assert.equal(slugify("Даршилсан өргөст хэмх"), "darshilsan-orgost-khemkh");
  });

  test("монгол өвөрмөц үсгүүд (ө, ү, х, ц, ч, ш, ж)", () => {
    assert.equal(slugify("Өвөл"), "ovol");
    assert.equal(slugify("Үзэм"), "uzem");
    assert.equal(slugify("Хужир"), "khujir");
    assert.equal(slugify("Цэцэг"), "tsetseg");
    assert.equal(slugify("Чихэр"), "chikher");
    assert.equal(slugify("Шүүс"), "shuus");
  });

  test("латин нэрийг хэвээр үлдээнэ", () => {
    assert.equal(slugify("Freshpack Classic"), "freshpack-classic");
  });

  test("кирилл + латин + тоо холилдсон", () => {
    assert.equal(slugify("Нухаш 500гр"), "nukhash-500gr");
  });

  test("илүүдэл зай, зураас цэгцэрнэ", () => {
    assert.equal(slugify("  Алим   шүүс  "), "alim-shuus");
    assert.equal(slugify("Алим -- шүүс"), "alim-shuus");
  });

  test("эхэн ба төгсгөлийн зураас арилна", () => {
    assert.equal(slugify("---Алим---"), "alim");
  });

  test("цэг таслал зэрэг тэмдэг хасагдана", () => {
    assert.equal(slugify("Алим, шүүс (1л)!"), "alim-shuus-1l");
  });

  test("зөөлний ба хатуугийн тэмдэг ул мөргүй арилна", () => {
    assert.equal(slugify("Тансаг амьтай"), "tansag-amtai");
    assert.equal(slugify("ЁЖЩЪЬЭЮЯ"), "yojscheyuya");
  });

  test("үр дүн үргэлж URL-д тохирсон байна", () => {
    const inputs = [
      "Даршилсан өргөст хэмх",
      "Алим, шүүс (1л)!",
      "  Нухаш   500гр  ",
      "ЁЖЩЪЬЭЮЯ",
    ];
    for (const s of inputs) {
      const out = slugify(s);
      assert.match(out, /^[a-z0-9-]*$/, `"${s}" → "${out}" зөвшөөрөгдөөгүй тэмдэгттэй`);
      assert.ok(!out.startsWith("-") && !out.endsWith("-"), `"${out}" зураасаар эхэлж/төгсөж болохгүй`);
    }
  });
});

describe("formatPhone", () => {
  test("8 оронтой дугаарт +976 нэмнэ", () => {
    assert.equal(formatPhone("94070800"), "+976 9407 0800");
  });

  test("976 угтвартай 11 орон", () => {
    assert.equal(formatPhone("97694070800"), "+976 9407 0800");
  });

  test("аль хэдийн форматтай дугаар", () => {
    assert.equal(formatPhone("+976 9407 0800"), "+976 9407 0800");
  });

  test("зураас, хаалттай оролт", () => {
    assert.equal(formatPhone("9407-0800"), "+976 9407 0800");
  });

  test("таних боломжгүй бол оролтыг хэвээр буцаана", () => {
    assert.equal(formatPhone("123"), "123");
    assert.equal(formatPhone(""), "");
  });
});

describe("formatMnt", () => {
  test("мянгатын таслалтай, ₮ тэмдэгтэй", () => {
    assert.equal(formatMnt(47_500), "₮47,500");
  });

  test("тэг ба сая", () => {
    assert.equal(formatMnt(0), "₮0");
    assert.equal(formatMnt(1_234_567), "₮1,234,567");
  });
});
