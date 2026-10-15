/**
 * applyFreshPrices — сагсны хуучин үнийг сангийн үнээр солих.
 *
 * АЛДАА БАЙСАН (2026-10-15): сагс бараа нэмсэн үеийн үнийг localStorage-д
 * хадгалж, хэзээ ч шинэчилдэггүй байв. vidan.mn дээрх сагсанд Хүрэн манжин
 * салат 4,320₮ гэж харагдаж байхад жинхэнэ үнэ 4,800₮ — place_order
 * сангийн үнээр бодох тул хэрэглэгч сагсандаа харснаасаа их төлөх байв.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { applyFreshPrices, type CartItem } from "./cart.ts";

const item = (productId: string, price: number, name = productId): CartItem => ({
  productId,
  sku: productId,
  slug: productId,
  name,
  price,
  quantity: 1,
});

describe("applyFreshPrices", () => {
  test("хуучин үнийг сангийн үнээр солиж, өөрчлөгдсөн тоог буцаана", () => {
    const items = [item("salat", 4_320), item("kompot", 8_550), item("bunio", 4_900)];
    const r = applyFreshPrices(items, [
      { productId: "salat", price: 4_800, name: "salat" },
      { productId: "kompot", price: 9_500, name: "kompot" },
      { productId: "bunio", price: 4_900, name: "bunio" },
    ]);
    assert.deepEqual(r.items.map((i) => i.price), [4_800, 9_500, 4_900]);
    assert.equal(r.changed, 2);
  });

  test("тоо ширхэг, бусад талбар хэвээр", () => {
    const items = [{ ...item("a", 100), quantity: 3, imageUrl: "x.jpg" }];
    const r = applyFreshPrices(items, [{ productId: "a", price: 150, name: "a" }]);
    assert.equal(r.items[0].quantity, 3);
    assert.equal(r.items[0].imageUrl, "x.jpg");
  });

  test("юу ч өөрчлөгдөөгүй бол ижил массив буцаана (дахин рендерлэхгүй)", () => {
    const items = [item("a", 100)];
    const r = applyFreshPrices(items, [{ productId: "a", price: 100, name: "a" }]);
    assert.equal(r.items, items);
    assert.equal(r.changed, 0);
  });

  test("зөвхөн нэр солигдвол нэрийг шинэчилнэ, үнийн өөрчлөлтөд тооцохгүй", () => {
    const r = applyFreshPrices([item("a", 100, "Хуучин нэр")], [
      { productId: "a", price: 100, name: "Шинэ нэр" },
    ]);
    assert.equal(r.items[0].name, "Шинэ нэр");
    assert.equal(r.changed, 0);
  });

  test("сангаас олдоогүй бараа хэвээр үлдэнэ", () => {
    const items = [item("a", 100), item("gone", 200)];
    const r = applyFreshPrices(items, [{ productId: "a", price: 120, name: "a" }]);
    assert.deepEqual(r.items.map((i) => [i.productId, i.price]), [["a", 120], ["gone", 200]]);
  });
});
