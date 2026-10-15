/**
 * summarizePromotions / campaignSpans — урамшууллын тайлангийн тест.
 *
 * Жишээ нь бодит 9-р сарын VIDAN 10% кампанит ажил: анх 09-01…09-07,
 * дараа нь админ 09-08 13:59-д (УБ) 09-14 хүртэл сунгасан. Тайланд нэг
 * кампанит ажил "2026.09.01 – 09.14" гэж харагдах ёстой.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  campaignSpans,
  financePromoSummary,
  summarizePromotions,
  type CampaignLogRow,
  type PromoReportOrder,
  type PromotionRow,
} from "./promo-report.ts";

const SEP_LOG: CampaignLogRow[] = [
  {
    code: "vidan-sep-2026",
    name: "VIDAN 10% хямдрал",
    brand_slug: "vidan",
    percent: 10,
    starts_at: "2026-08-31T16:00:00Z",
    ends_at: "2026-09-07T16:00:00Z",
    enabled: true,
    recorded_at: "2026-08-31T15:00:00Z",
  },
  {
    code: "vidan-sep-2026",
    name: "VIDAN 10% хямдрал",
    brand_slug: "vidan",
    percent: 10,
    starts_at: "2026-09-07T16:00:00Z",
    ends_at: "2026-09-14T16:00:00Z",
    enabled: true,
    recorded_at: "2026-09-08T05:59:16Z",
  },
];

/** 2026-09-01 … 09-15 (УБ) — тайлангийн эхний хагас сар */
const SEP_FIRST = {
  start: Date.parse("2026-08-31T16:00:00Z"),
  end: Date.parse("2026-09-15T16:00:00Z"),
};

const line = (
  sku: string,
  unit: number,
  qty: number,
  list: number | null = unit,
  campaign: string | null = null,
) => ({
  product_id: sku,
  product_name: sku,
  product_sku: sku,
  quantity: qty,
  unit_price: unit,
  list_price: list,
  sale_campaign: campaign,
});

const order = (
  id: string,
  created_at: string,
  items: PromoReportOrder["items"],
  discount = 0,
): PromoReportOrder => ({ id, created_at, discount, items });

describe("campaignSpans", () => {
  test("сунгасан кампанит ажлыг нэг хугацаа болгож нэгтгэнэ", () => {
    const spans = campaignSpans(SEP_LOG);
    assert.equal(spans.length, 1);
    assert.equal(new Date(spans[0].start).toISOString(), "2026-08-31T16:00:00.000Z");
    assert.equal(new Date(spans[0].end).toISOString(), "2026-09-14T16:00:00.000Z");
  });

  test("унтраасан хувилбар кампанит ажлыг тэр мөчид дуусгана", () => {
    const spans = campaignSpans([
      { ...SEP_LOG[0], ends_at: "2026-09-30T16:00:00Z" },
      { ...SEP_LOG[0], enabled: false, recorded_at: "2026-09-03T04:00:00Z" },
    ]);
    assert.equal(spans.length, 1);
    assert.equal(new Date(spans[0].end).toISOString(), "2026-09-03T04:00:00.000Z");
  });

  test("ирээдүйд хадгалсан ч хугацаа нь өнгөрсөн хувилбар ажиллаагүй гэж тооцно", () => {
    const spans = campaignSpans([
      { ...SEP_LOG[0], recorded_at: "2026-10-01T00:00:00Z" },
    ]);
    assert.equal(spans.length, 0);
  });

  test("өөр хувьтай дараагийн кампанит ажлыг нэгтгэхгүй", () => {
    const spans = campaignSpans([
      SEP_LOG[0],
      { ...SEP_LOG[1], percent: 15, name: "VIDAN 15%" },
    ]);
    assert.equal(spans.length, 2);
  });
});

describe("summarizePromotions — кампанит ажил", () => {
  const orders = [
    // #10305 — 2,500 → 2,250
    order("10305", "2026-09-14T02:56:00Z", [line("VIDAN032", 2_250, 1, 2_500, "vidan-sep-2026")]),
    // #10287 — хямдралтай VIDAN + хямдралгүй Мангас
    order("10287", "2026-09-04T20:18:00Z", [
      line("VIDAN006", 4_320, 30, 4_800, "vidan-sep-2026"),
      line("VIDAN011", 3_900, 10),
    ]),
    // Хямдралгүй захиалга
    order("10316", "2026-10-13T03:04:00Z", [line("VIDAN027", 5_800, 1)]),
  ];

  const r = summarizePromotions({
    orders,
    campaignLog: SEP_LOG,
    promotions: [],
    redemptions: [],
    period: SEP_FIRST,
  });

  test("нэг кампанит ажил, зарлагдсан хугацаатай", () => {
    assert.equal(r.entries.length, 1);
    const e = r.entries[0];
    assert.equal(e.kind, "campaign");
    assert.equal(e.name, "VIDAN 10% хямдрал");
    assert.equal(e.detail, "10% · vidan");
    assert.equal(e.startsAt, "2026-08-31T16:00:00.000Z");
    assert.equal(e.endsAt, "2026-09-14T16:00:00.000Z");
  });

  test("хямдрал = (үндсэн − зарагдсан) × ширхэг; хямдралгүй мөр орохгүй", () => {
    const e = r.entries[0];
    assert.equal(e.orders, 2);
    assert.equal(e.quantity, 31);
    assert.equal(e.discount, 250 + 480 * 30);
    assert.equal(e.listAmount, 2_500 + 4_800 * 30);
    assert.equal(e.soldAmount, e.listAmount - e.discount);
    assert.deepEqual(e.products.map((p) => p.sku), ["VIDAN006", "VIDAN032"]);
    assert.equal(r.totalDiscount, e.discount);
  });

  test("хугацаанд нь захиалга байхгүй ч зарлагдсан бол харагдана", () => {
    const empty = summarizePromotions({
      orders: [],
      campaignLog: SEP_LOG,
      promotions: [],
      redemptions: [],
      period: SEP_FIRST,
    });
    assert.equal(empty.entries.length, 1);
    assert.equal(empty.entries[0].discount, 0);
  });

  test("хугацаатай огт давхцаагүй кампанит ажил харагдахгүй", () => {
    const oct = summarizePromotions({
      orders: [orders[2]],
      campaignLog: SEP_LOG,
      promotions: [],
      redemptions: [],
      period: { start: Date.parse("2026-09-30T16:00:00Z"), end: Date.parse("2026-10-15T16:00:00Z") },
    });
    assert.equal(oct.entries.length, 0);
  });

  test("кампанит ажилгүй зураастай үнэ 'гараар' мөрөнд", () => {
    const m = summarizePromotions({
      orders: [order("a", "2026-10-02T00:00:00Z", [line("X", 4_000, 2, 4_500, null)])],
      campaignLog: [],
      promotions: [],
      redemptions: [],
      period: SEP_FIRST,
    });
    assert.equal(m.entries[0].kind, "manual");
    assert.equal(m.entries[0].discount, 1_000);
  });
});

describe("summarizePromotions — промо код", () => {
  const NEW10: PromotionRow = {
    id: "p1",
    code: "NEW10",
    name: "Шинэ хэрэглэгчийн урамшуулал",
    type: "percent",
    value: 10,
    starts_at: "2026-05-28T00:00:00Z",
    ends_at: "2027-05-28T00:00:00Z",
    is_active: true,
  };

  test("захиалгын хөнгөлөлтийг бараанд харьцаагаар хувааж, нийлбэр яг тэнцэнэ", () => {
    const o = order(
      "o1",
      "2026-09-05T00:00:00Z",
      [line("A", 3_333, 1), line("B", 6_667, 2)],
      1_667,
    );
    const r = summarizePromotions({
      orders: [o],
      campaignLog: [],
      promotions: [NEW10],
      redemptions: [{ promo_id: "p1", order_id: "o1", discount: 1_667 }],
      period: SEP_FIRST,
    });
    const e = r.entries[0];
    assert.equal(e.kind, "promo");
    assert.equal(e.detail, "NEW10 · 10%");
    assert.equal(e.orders, 1);
    assert.equal(e.discount, 1_667);
    assert.equal(e.products.reduce((s, p) => s + p.discount, 0), 1_667);
    assert.equal(e.listAmount, 3_333 + 6_667 * 2);
  });

  test("ашиглагдаагүй ч идэвхтэй, хугацаа давхцсан код 0-ээр харагдана", () => {
    const r = summarizePromotions({
      orders: [],
      campaignLog: [],
      promotions: [NEW10],
      redemptions: [],
      period: SEP_FIRST,
    });
    assert.equal(r.entries.length, 1);
    assert.equal(r.entries[0].orders, 0);
  });

  test("унтраасан, ашиглагдаагүй код харагдахгүй", () => {
    const r = summarizePromotions({
      orders: [],
      campaignLog: [],
      promotions: [{ ...NEW10, is_active: false }],
      redemptions: [],
      period: SEP_FIRST,
    });
    assert.equal(r.entries.length, 0);
  });

  test("тайлангийн хугацаанаас гадуурх захиалгын хэрэглээ тоологдохгүй", () => {
    const r = summarizePromotions({
      orders: [],
      campaignLog: [],
      promotions: [{ ...NEW10, is_active: false }],
      redemptions: [{ promo_id: "p1", order_id: "other-period", discount: 500 }],
      period: SEP_FIRST,
    });
    assert.equal(r.entries.length, 0);
  });
});

describe("financePromoSummary — санхүүгийн задаргааны мөрүүд", () => {
  const PROMO: PromotionRow = {
    id: "p1",
    code: "NEW10",
    name: "Шинэ хэрэглэгч",
    type: "percent",
    value: 10,
    starts_at: null,
    ends_at: null,
    is_active: true,
  };
  const orders = [
    order("a", "2026-09-04T00:00:00Z", [line("VIDAN006", 4_320, 10, 4_800, "vidan-sep-2026")]),
    order("b", "2026-09-05T00:00:00Z", [line("X", 10_000, 1)], 1_000),
  ];
  const report = summarizePromotions({
    orders,
    campaignLog: SEP_LOG,
    promotions: [PROMO, { ...PROMO, id: "p2", code: "VIP5K" }],
    redemptions: [{ promo_id: "p1", order_id: "b", discount: 1_000 }],
    period: SEP_FIRST,
  });
  const s = financePromoSummary(report);

  test("үнийн хямдрал ба промо кодыг салгана; ашиглагдаагүй код орохгүй", () => {
    assert.equal(s.priceDiscount, 4_800);
    assert.deepEqual(s.priceRows.map((e) => e.name), ["VIDAN 10% хямдрал"]);
    assert.deepEqual(s.promoRows.map((e) => e.detail), ["NEW10 · 10%"]);
  });

  test("хямдралын өмнөх борлуулалт − хямдрал = захиалгын барааны дүн", () => {
    const goods = orders.reduce((t, o) => t + o.items.reduce((u, i) => u + i.unit_price * i.quantity, 0), 0);
    const listGoods = goods + s.priceDiscount;
    assert.equal(listGoods, 4_800 * 10 + 10_000);
    assert.equal(listGoods - s.priceDiscount, goods);
  });
});
