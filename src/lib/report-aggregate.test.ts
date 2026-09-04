/**
 * Тайлангийн нэгтгэлийн тест — эдгээр тоо санхүүд очдог.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeByCategory,
  summarizeByDay,
  summarizeByPayment,
  summarizeFinance,
  summarizeInventory,
  summarizeSoldProducts,
  soldQuantityByProduct,
  type ReportOrder,
  type ReportOrderItem,
  type StockRow,
} from "./report-aggregate.ts";
import { ubDateKey } from "./datetime.ts";
import { periodDayKeys } from "./report-period.ts";

function item(over: Partial<ReportOrderItem> = {}): ReportOrderItem {
  return {
    product_id: "p1",
    product_name: "Даршилсан өргөст хэмх",
    product_sku: "VDN-001",
    quantity: 1,
    subtotal: 12_000,
    ...over,
  };
}

function order(over: Partial<ReportOrder> = {}): ReportOrder {
  const items = over.items ?? [item()];
  const goods = items.reduce((s, i) => s + i.subtotal, 0);
  const discount = over.discount ?? 0;
  const shipping = over.shipping ?? 7_000;
  const tax = over.tax ?? Math.round((goods - discount) * 0.1);
  return {
    subtotal: goods,
    discount,
    shipping,
    tax,
    total: goods - discount + shipping + tax,
    payment_method: "qpay",
    created_at: "2026-09-02T04:00:00.000Z",
    ...over,
    items,
  };
}

describe("summarizeFinance — барааны орлого ба хүргэлт салгах", () => {
  test("хоосон хугацаанд бүх тоо тэг", () => {
    const f = summarizeFinance([]);
    assert.equal(f.total, 0);
    assert.equal(f.deliveries, 0);
    assert.equal(f.avgOrder, 0, "тэгд хуваахгүй");
  });

  test("бараа, хүргэлт, НӨАТ тус тусдаа нэгтгэгдэнэ", () => {
    const f = summarizeFinance([
      order({ items: [item({ subtotal: 30_000, quantity: 2 })], shipping: 7_000 }),
      order({ items: [item({ subtotal: 20_000 })], shipping: 14_000 }),
    ]);
    assert.equal(f.goods, 50_000);
    assert.equal(f.shipping, 21_000);
    assert.equal(f.tax, 5_000);
    assert.equal(f.orders, 2);
  });

  test("хүргэлтийн тоо нь хүргэлтийн төлбөр авсан захиалгын тоо", () => {
    const f = summarizeFinance([
      order({ shipping: 7_000 }),
      order({ shipping: 7_000 }),
      order({ shipping: 0 }),
    ]);
    assert.equal(f.deliveries, 2, "үнэгүй хүргэлттэй захиалга тоологдохгүй");
    assert.equal(f.shipping, 14_000);
  });

  test("цэвэр барааны орлого = бараа − хөнгөлөлт", () => {
    const f = summarizeFinance([
      order({ items: [item({ subtotal: 50_000 })], discount: 5_000 }),
    ]);
    assert.equal(f.goods, 50_000);
    assert.equal(f.discount, 5_000);
    assert.equal(f.netGoods, 45_000);
  });

  test("нийт дүн нь задаргаатайгаа тэнцэнэ (санхүүгийн гол шалгуур)", () => {
    const orders = [
      order({ items: [item({ subtotal: 50_000 })], discount: 5_000, shipping: 7_000 }),
      order({ items: [item({ subtotal: 30_000 })], shipping: 14_000 }),
      order({ items: [item({ subtotal: 25_000 })], shipping: 0 }),
    ];
    const f = summarizeFinance(orders);
    assert.equal(f.total, f.netGoods + f.shipping + f.tax);
  });

  test("дундаж захиалга нь нийт дүнг захиалгын тоонд хуваасан", () => {
    const f = summarizeFinance([order({ total: 40_000 }), order({ total: 60_000 })]);
    assert.equal(f.avgOrder, 50_000);
  });
});

describe("summarizeSoldProducts — тоо ширхэгээр", () => {
  test("ижил бараа олон захиалгад орвол нэгтгэнэ", () => {
    const rows = summarizeSoldProducts([
      order({ items: [item({ quantity: 2, subtotal: 24_000 })] }),
      order({ items: [item({ quantity: 3, subtotal: 36_000 })] }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sold, 5);
    assert.equal(rows[0].revenue, 60_000);
    assert.equal(rows[0].sku, "VDN-001");
  });

  test("өөр бараа тусдаа мөр болно", () => {
    const rows = summarizeSoldProducts([
      order({
        items: [
          item({ product_id: "p1", product_name: "Өргөст хэмх", quantity: 2, subtotal: 24_000 }),
          item({ product_id: "p2", product_name: "Нухаш", product_sku: "VDN-014", quantity: 1, subtotal: 9_000 }),
        ],
      }),
    ]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.name), ["Өргөст хэмх", "Нухаш"]);
  });

  test("дүнгээр буурахаар эрэмбэлэгдэнэ", () => {
    const rows = summarizeSoldProducts([
      order({
        items: [
          item({ product_id: "a", product_name: "Бага", subtotal: 5_000 }),
          item({ product_id: "b", product_name: "Их", subtotal: 50_000 }),
        ],
      }),
    ]);
    assert.deepEqual(rows.map((r) => r.name), ["Их", "Бага"]);
  });

  test("product_id байхгүй бол нэр+SKU-гээр нэгтгэнэ", () => {
    const rows = summarizeSoldProducts([
      order({ items: [item({ product_id: null, quantity: 1, subtotal: 12_000 })] }),
      order({ items: [item({ product_id: null, quantity: 2, subtotal: 24_000 })] }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sold, 3);
  });

  test("SKU байхгүй бол зураас", () => {
    const rows = summarizeSoldProducts([
      order({ items: [item({ product_sku: null })] }),
    ]);
    assert.equal(rows[0].sku, "—");
  });

  test("нийт дүн нь санхүүгийн барааны дүнтэй таарна", () => {
    const orders = [
      order({ items: [item({ product_id: "a", subtotal: 30_000 })] }),
      order({ items: [item({ product_id: "b", subtotal: 20_000 })] }),
    ];
    const sold = summarizeSoldProducts(orders).reduce((s, r) => s + r.revenue, 0);
    assert.equal(sold, summarizeFinance(orders).goods);
  });
});

describe("summarizeByDay", () => {
  test("захиалгагүй өдөр 0-ээр гарна", () => {
    const keys = periodDayKeys({ from: "2026-09-01", to: "2026-09-03" });
    const rows = summarizeByDay(
      [order({ created_at: "2026-09-01T04:00:00.000Z", total: 50_000 })],
      keys,
      ubDateKey,
    );
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((r) => r.revenue), [50_000, 0, 0]);
  });

  test("UB шөнө дундын өмнөх захиалга зөв өдөрт унана", () => {
    const keys = periodDayKeys({ from: "2026-09-01", to: "2026-09-02" });
    // UB-гийн 9-р сарын 1, 23:30 = UTC 15:30
    const rows = summarizeByDay(
      [order({ created_at: "2026-09-01T15:30:00.000Z", total: 10_000 })],
      keys,
      ubDateKey,
    );
    assert.equal(rows[0].revenue, 10_000, "UB-гийн 1-нд орох ёстой");
    assert.equal(rows[1].revenue, 0);
  });

  test("завсраас гадуурх захиалга алдаа өгөхгүй, тоологдохгүй", () => {
    const keys = periodDayKeys({ from: "2026-09-01", to: "2026-09-02" });
    const rows = summarizeByDay(
      [order({ created_at: "2026-07-01T04:00:00.000Z", total: 99_000 })],
      keys,
      ubDateKey,
    );
    assert.equal(rows.reduce((s, r) => s + r.revenue, 0), 0);
  });
});

describe("summarizeByCategory ба summarizeByPayment", () => {
  test("ангилалгүй бараа 'Бусад' болно", () => {
    const rows = summarizeByCategory([order({ items: [item({ subtotal: 10_000 })] })]);
    assert.equal(rows[0].name, "Бусад");
    assert.equal(rows[0].share, 1);
  });

  test("ангиллын хувь нийлээд 1 болно", () => {
    const rows = summarizeByCategory([
      order({
        items: [
          item({ product_id: "a", subtotal: 30_000, product: { category: { name_mn: "Даршил" } } }),
          item({ product_id: "b", subtotal: 10_000, product: { category: { name_mn: "Нухаш" } } }),
        ],
      }),
    ]);
    assert.equal(Math.round(rows.reduce((s, r) => s + r.share, 0) * 1000) / 1000, 1);
    assert.equal(rows[0].name, "Даршил");
  });

  test("төлбөрийн арга — тоо ба дүн", () => {
    const rows = summarizeByPayment([
      order({ payment_method: "qpay", total: 40_000 }),
      order({ payment_method: "qpay", total: 60_000 }),
      order({ payment_method: null, total: 10_000 }),
    ]);
    assert.equal(rows[0].method, "qpay");
    assert.equal(rows[0].count, 2);
    assert.equal(rows[0].revenue, 100_000);
    assert.equal(rows[1].method, "—");
  });
});

describe("summarizeInventory — агуулахын үлдэгдэл", () => {
  function stock(over: Partial<StockRow> = {}): StockRow {
    return {
      name_mn: "Өргөст хэмх",
      sku: "VDN-001",
      stock: 50,
      price: 12_000,
      stock_threshold: 20,
      ...over,
    };
  }

  test("нийт тоо ширхэг ба дүн", () => {
    const inv = summarizeInventory([
      stock({ sku: "A", stock: 50, price: 12_000 }),
      stock({ sku: "B", stock: 30, price: 9_000 }),
    ]);
    assert.equal(inv.totalUnits, 80);
    assert.equal(inv.totalValue, 50 * 12_000 + 30 * 9_000);
    assert.equal(inv.skuCount, 2);
  });

  test("босго хүрсэн ба дууссаныг тоолно", () => {
    const inv = summarizeInventory([
      stock({ sku: "A", stock: 100, stock_threshold: 20 }),
      stock({ sku: "B", stock: 15, stock_threshold: 20 }),
      stock({ sku: "C", stock: 0 }),
    ]);
    assert.equal(inv.lowCount, 1, "зөвхөн B");
    assert.equal(inv.outCount, 1, "зөвхөн C");
  });

  test("дууссан бараа 'дуусах дөхсөн' гэж давхар тоологдохгүй", () => {
    const inv = summarizeInventory([stock({ stock: 0, stock_threshold: 20 })]);
    assert.equal(inv.lowCount, 0);
    assert.equal(inv.outCount, 1);
  });

  test("үлдэгдэл цөөрснөөр эрэмбэлнэ — дуусах дөхсөн нь эхэнд", () => {
    const inv = summarizeInventory([
      stock({ sku: "A", stock: 100 }),
      stock({ sku: "B", stock: 0 }),
      stock({ sku: "C", stock: 12 }),
    ]);
    assert.deepEqual(inv.items.map((i) => i.sku), ["B", "C", "A"]);
  });

  test("сөрөг үлдэгдэл дууссанд тооцогдоно", () => {
    const inv = summarizeInventory([stock({ stock: -3 })]);
    assert.equal(inv.outCount, 1);
  });

  test("хоосон агуулах", () => {
    const inv = summarizeInventory([]);
    assert.deepEqual(
      [inv.totalUnits, inv.totalValue, inv.skuCount],
      [0, 0, 0],
    );
  });
});

describe("soldQuantityByProduct — агуулахын зарлага", () => {
  test("бүтээгдэхүүн тус бүрийн зарагдсан тоог нэгтгэнэ", () => {
    const m = soldQuantityByProduct([
      order({
        items: [
          item({ product_id: "a", quantity: 2 }),
          item({ product_id: "b", quantity: 5 }),
        ],
      }),
      order({ items: [item({ product_id: "a", quantity: 3 })] }),
    ]);
    assert.equal(m.get("a"), 5);
    assert.equal(m.get("b"), 5);
  });

  test("зарагдаагүй бараа map-д орохгүй (дуудагч 0 гэж үзнэ)", () => {
    const m = soldQuantityByProduct([order({ items: [item({ product_id: "a" })] })]);
    assert.equal(m.get("байхгүй"), undefined);
  });

  test("устгагдсан барааг (product_id null) алгасна", () => {
    const m = soldQuantityByProduct([
      order({
        items: [
          item({ product_id: null, quantity: 9 }),
          item({ product_id: "a", quantity: 1 }),
        ],
      }),
    ]);
    assert.equal(m.size, 1);
    assert.equal(m.get("a"), 1);
  });

  test("нийт зарлага нь зарагдсан барааны нийт тоотой таарна", () => {
    const orders = [
      order({ items: [item({ product_id: "a", quantity: 4 }), item({ product_id: "b", quantity: 6 })] }),
      order({ items: [item({ product_id: "a", quantity: 2 })] }),
    ];
    const viaMap = [...soldQuantityByProduct(orders).values()].reduce((s, v) => s + v, 0);
    const viaList = summarizeSoldProducts(orders).reduce((s, p) => s + p.sold, 0);
    assert.equal(viaMap, viaList);
  });

  test("захиалгагүй бол хоосон", () => {
    assert.equal(soldQuantityByProduct([]).size, 0);
  });
});
