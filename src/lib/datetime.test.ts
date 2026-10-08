import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatUbDate, formatUbDateTime } from "./datetime.ts";

/**
 * Сервер (Vercel) UTC-аар ажилладаг. Эдгээр тест нь процессын цагийн бүсээс
 * үл хамааран УБ цаг гарч байгааг бэхэлнэ — `TZ=UTC pnpm test` гэж
 * ажиллуулсан ч тэнцэх ёстой.
 */
describe("formatUbDateTime", () => {
  const HM: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  test("UTC агшинг УБ цагаар (+8) бичнэ", () => {
    // Захиалга #10314: 07:46 UTC = 15:46 УБ
    assert.match(formatUbDateTime("2026-10-02T07:46:34Z", HM), /15:46/);
  });

  test("шөнө дундын заагт өдөр нь УБ-аар шилжинэ", () => {
    // 10-р сарын 2-ны 17:30 UTC = УБ-д 10-р сарын 3-ны 01:30
    const s = formatUbDateTime("2026-10-02T17:30:00Z", {
      month: "numeric",
      day: "numeric",
      ...HM,
    });
    assert.match(s, /01:30/);
    assert.match(s, /3/);
    assert.doesNotMatch(s, /17:30/);
  });

  test("Date объект хүлээж авна", () => {
    assert.match(formatUbDateTime(new Date("2026-01-01T00:00:00Z"), HM), /08:00/);
  });
});

describe("formatUbDate", () => {
  test("УБ-д шинэ өдөр эхэлсэн бол UTC-ийн өмнөх өдрийг харуулахгүй", () => {
    // 10-р сарын 7-ны 20:00 UTC = УБ-д 10-р сарын 8-ны 04:00
    const s = formatUbDate("2026-10-07T20:00:00Z", { day: "numeric" });
    assert.match(s, /8/);
  });
});
