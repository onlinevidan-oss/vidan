/**
 * Тайлангийн хугацааны логик.
 *
 * Санхүүгийн тайлан сард 2 удаа гардаг тул завсрын зааг буруу бол
 * захиалга хоёр тайланд давхар орох, эсвэл аль алинд нь ороогүй үлдэх
 * эрсдэлтэй. Сервер UTC-аар ажилладаг тул UB (UTC+8) шилжилтийг тусад нь
 * шалгана.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  daysBetween,
  formatPeriodLabel,
  isValidDateKey,
  periodDayKeys,
  periodToUtcRange,
  resolvePeriod,
} from "./report-period.ts";

/** UB цагаар өгсөн агшныг UTC Date болгож буцаах туслах */
function ubMoment(iso: string): Date {
  return new Date(`${iso}+08:00`);
}

describe("resolvePeriod — preset", () => {
  test("энэ сарын эхний хагас", () => {
    const p = resolvePeriod({ preset: "this-first" }, ubMoment("2026-09-20T10:00"));
    assert.equal(p.from, "2026-09-01");
    assert.equal(p.to, "2026-09-15");
    assert.equal(p.days, 15);
  });

  test("энэ сарын хоёрдугаар хагас нь сарын сүүл хүртэл", () => {
    const p = resolvePeriod({ preset: "this-second" }, ubMoment("2026-09-04T10:00"));
    assert.equal(p.from, "2026-09-16");
    assert.equal(p.to, "2026-09-30", "9-р сар 30 хоногтой");
    assert.equal(p.days, 15);
  });

  test("31 хоногтой сарын хоёрдугаар хагас 16 хоног", () => {
    const p = resolvePeriod({ preset: "this-second" }, ubMoment("2026-08-20T10:00"));
    assert.equal(p.to, "2026-08-31");
    assert.equal(p.days, 16);
  });

  test("2-р сарын сүүл зөв (2026 — үсрэлтийн бус жил)", () => {
    const p = resolvePeriod({ preset: "this-second" }, ubMoment("2026-02-20T10:00"));
    assert.equal(p.to, "2026-02-28");
  });

  test("үсрэлтийн жилийн 2-р сар", () => {
    const p = resolvePeriod({ preset: "this-second" }, ubMoment("2028-02-20T10:00"));
    assert.equal(p.to, "2028-02-29");
  });

  test("өнгөрсөн сарын хагасууд", () => {
    const now = ubMoment("2026-09-04T10:00");
    assert.deepEqual(
      [resolvePeriod({ preset: "prev-first" }, now).from, resolvePeriod({ preset: "prev-first" }, now).to],
      ["2026-08-01", "2026-08-15"],
    );
    assert.deepEqual(
      [resolvePeriod({ preset: "prev-second" }, now).from, resolvePeriod({ preset: "prev-second" }, now).to],
      ["2026-08-16", "2026-08-31"],
    );
  });

  test("1-р сард 'өнгөрсөн сар' нь өмнөх оны 12-р сар", () => {
    const p = resolvePeriod({ preset: "prev-first" }, ubMoment("2026-01-10T10:00"));
    assert.equal(p.from, "2025-12-01");
    assert.equal(p.to, "2025-12-15");
  });

  test("сүүлийн 30 хоног нь өнөөдрийг оруулаад 30 хоног", () => {
    const p = resolvePeriod({ preset: "last30" }, ubMoment("2026-09-04T10:00"));
    assert.equal(p.to, "2026-09-04");
    assert.equal(p.from, "2026-08-06");
    assert.equal(p.days, 30);
  });
});

describe("resolvePeriod — өгөгдмөл сонголт", () => {
  test("сарын 15 хүртэл бол эхний хагас", () => {
    const p = resolvePeriod({}, ubMoment("2026-09-15T23:00"));
    assert.equal(p.preset, "this-first");
  });

  test("сарын 16-наас бол хоёрдугаар хагас", () => {
    const p = resolvePeriod({}, ubMoment("2026-09-16T00:30"));
    assert.equal(p.preset, "this-second");
  });

  test("танихгүй preset ирвэл өгөгдмөл рүү унана", () => {
    const p = resolvePeriod({ preset: "хуурамч" }, ubMoment("2026-09-04T10:00"));
    assert.equal(p.preset, "this-first");
  });
});

describe("resolvePeriod — гараар оруулсан завсар", () => {
  test("from ба to хоёул хүчинтэй бол custom", () => {
    const p = resolvePeriod({ from: "2026-07-03", to: "2026-07-09" });
    assert.equal(p.preset, "custom");
    assert.equal(p.days, 7);
  });

  test("урвуу оруулсныг солино", () => {
    const p = resolvePeriod({ from: "2026-07-09", to: "2026-07-03" });
    assert.equal(p.from, "2026-07-03");
    assert.equal(p.to, "2026-07-09");
  });

  test("нэг нь л байвал preset руу шилжинэ", () => {
    const p = resolvePeriod({ from: "2026-07-03" }, ubMoment("2026-09-04T10:00"));
    assert.equal(p.preset, "this-first");
  });

  test("буруу огноог үл тоомсорлоно", () => {
    const p = resolvePeriod(
      { from: "2026-02-31", to: "2026-03-05" },
      ubMoment("2026-09-04T10:00"),
    );
    assert.equal(p.preset, "this-first", "буруу огноо custom болохгүй");
  });
});

describe("isValidDateKey", () => {
  test("зөв огноо", () => {
    assert.ok(isValidDateKey("2026-09-04"));
    assert.ok(isValidDateKey("2028-02-29"), "үсрэлтийн жил");
  });

  test("буруу огноо", () => {
    assert.ok(!isValidDateKey("2026-02-31"));
    assert.ok(!isValidDateKey("2026-13-01"));
    assert.ok(!isValidDateKey("2026-9-4"), "тэглэлгүй");
    assert.ok(!isValidDateKey("өчигдөр"));
    assert.ok(!isValidDateKey(undefined));
    assert.ok(!isValidDateKey(null));
  });
});

describe("periodToUtcRange — UB заагийг UTC болгох", () => {
  test("эхлэл нь UB 00:00 = өмнөх өдрийн UTC 16:00", () => {
    const { since } = periodToUtcRange({ from: "2026-09-01", to: "2026-09-15" });
    assert.equal(since.toISOString(), "2026-08-31T16:00:00.000Z");
  });

  test("төгсгөл нь СҮҮЛИЙН ӨДРИЙН ДАРААХ UB 00:00 (сүүлийн өдөр бүтнээрээ орно)", () => {
    const { until } = periodToUtcRange({ from: "2026-09-01", to: "2026-09-15" });
    assert.equal(until.toISOString(), "2026-09-15T16:00:00.000Z");
  });

  test("хагас сарууд зааглаж, давхардахгүй, завсар үлдээхгүй", () => {
    const first = periodToUtcRange({ from: "2026-09-01", to: "2026-09-15" });
    const second = periodToUtcRange({ from: "2026-09-16", to: "2026-09-30" });
    assert.equal(
      first.until.toISOString(),
      second.since.toISOString(),
      "эхний хагасын төгсгөл нь хоёрдугаарын эхлэлтэй яг таарах ёстой",
    );
  });

  test("UB-гийн 15-ны 23:30-д хийсэн захиалга эхний хагаст орно", () => {
    const { since, until } = periodToUtcRange({ from: "2026-09-01", to: "2026-09-15" });
    const order = ubMoment("2026-09-15T23:30");
    assert.ok(order >= since && order < until);
  });

  test("UB-гийн 16-ны 00:30-д хийсэн захиалга эхний хагаст ОРОХГҮЙ", () => {
    const { until } = periodToUtcRange({ from: "2026-09-01", to: "2026-09-15" });
    assert.ok(ubMoment("2026-09-16T00:30") >= until);
  });
});

describe("periodDayKeys", () => {
  test("бүх өдрийг дарааллаар нь буцаана", () => {
    const keys = periodDayKeys({ from: "2026-08-30", to: "2026-09-02" });
    assert.deepEqual(keys, ["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"]);
  });

  test("нэг өдрийн завсар", () => {
    assert.deepEqual(periodDayKeys({ from: "2026-09-04", to: "2026-09-04" }), [
      "2026-09-04",
    ]);
  });

  test("өдрийн тоо daysBetween-тэй таарна", () => {
    const p = { from: "2026-08-06", to: "2026-09-04" };
    assert.equal(periodDayKeys(p).length, daysBetween(p.from, p.to));
  });
});

describe("formatPeriodLabel", () => {
  test("нэг сарын доторх завсар", () => {
    assert.equal(formatPeriodLabel("2026-09-01", "2026-09-15"), "2026 оны 9-р сарын 1–15");
  });

  test("нэг өдөр", () => {
    assert.equal(formatPeriodLabel("2026-09-04", "2026-09-04"), "2026 оны 9-р сарын 4");
  });

  test("сар дамнасан завсар", () => {
    assert.equal(
      formatPeriodLabel("2026-08-06", "2026-09-04"),
      "2026 оны 8-р сарын 6 – 9-р сарын 4",
    );
  });

  test("жил дамнасан завсар", () => {
    assert.equal(formatPeriodLabel("2025-12-20", "2026-01-05"), "2025.12.20 – 2026.01.05");
  });
});
