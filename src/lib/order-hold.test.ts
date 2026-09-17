import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  orderExpiresAt,
  isCancelWindow,
  ubHour,
  msUntilExpiry,
  HOLD_MINUTES,
} from "./order-hold.ts";

/** UB цагийг UTC агшин болгож бичих туслах */
const ub = (s: string) => new Date(`${s}+08:00`);
const ubStr = (d: Date) =>
  new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

describe("ubHour", () => {
  test("UTC-г UB цаг руу зөв хөрвүүлнэ", () => {
    assert.equal(ubHour(new Date("2026-09-16T15:03:00Z")), 23);
    assert.equal(ubHour(new Date("2026-09-16T01:00:00Z")), 9);
    assert.equal(ubHour(new Date("2026-09-16T16:00:00Z")), 0);
  });
});

describe("isCancelWindow", () => {
  test("өдрийн цагт цуцална", () => {
    assert.equal(isCancelWindow(ub("2026-09-16T09:00")), true);
    assert.equal(isCancelWindow(ub("2026-09-16T14:30")), true);
    assert.equal(isCancelWindow(ub("2026-09-16T21:59")), true);
  });
  test("шөнө цуцлахгүй", () => {
    assert.equal(isCancelWindow(ub("2026-09-16T22:00")), false);
    assert.equal(isCancelWindow(ub("2026-09-16T23:30")), false);
    assert.equal(isCancelWindow(ub("2026-09-17T03:00")), false);
    assert.equal(isCancelWindow(ub("2026-09-17T08:59")), false);
  });
});

describe("orderExpiresAt", () => {
  test("өдрийн захиалга — яг 120 минут", () => {
    const created = ub("2026-09-16T14:00");
    assert.equal(ubStr(orderExpiresAt(created)), "2026-09-16 16:00");
  });

  test("#10306-ийн бодит тохиолдол: 23:03-д өгсөн захиалга шөнө үхэхгүй", () => {
    // Энэ захиалга 379,900₮ байсан ба шөнийн 01:15-д цуцлагдсан.
    const created = new Date("2026-09-16T15:03:35Z"); // UB 23:03
    const exp = orderExpiresAt(created);
    assert.equal(ubStr(exp), "2026-09-17 09:00");
  });

  test("21:30-д өгсөн — 23:30 шөнө тул өглөө хүртэл", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-16T21:30"))), "2026-09-17 09:00");
  });

  test("21:00-д өгсөн — 23:00 шөнө тул өглөө хүртэл", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-16T21:00"))), "2026-09-17 09:00");
  });

  test("19:30-д өгсөн — 21:30 өдөр тул хэвийн", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-16T19:30"))), "2026-09-16 21:30");
  });

  test("шөнө дунд 02:00-д өгсөн — мөн тэр өглөө 09:00", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-17T02:00"))), "2026-09-17 09:00");
  });

  test("07:30-д өгсөн — 09:30 болох тул хэвийн", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-17T07:30"))), "2026-09-17 09:30");
  });

  test("08:00-д өгсөн — 10:00 хэвийн", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-17T08:00"))), "2026-09-17 10:00");
  });

  test("сарын сүүлийн өдөр шөнө — дараа сар руу зөв шилжинэ", () => {
    assert.equal(ubStr(orderExpiresAt(ub("2026-09-30T23:00"))), "2026-10-01 09:00");
  });

  test("хугацаа хэзээ ч урагшлахгүй — үргэлж 120 минутаас багагүй", () => {
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 17, 45]) {
        const c = ub(
          `2026-09-16T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
        const gap = (orderExpiresAt(c).getTime() - c.getTime()) / 60_000;
        assert.ok(gap >= HOLD_MINUTES, `${h}:${m} → ${gap} минут`);
      }
    }
  });

  test("цуцлагдах агшин үргэлж цуцлалтын цонхонд байна", () => {
    for (let h = 0; h < 24; h++) {
      const c = ub(`2026-09-16T${String(h).padStart(2, "0")}:00`);
      assert.ok(isCancelWindow(orderExpiresAt(c)), `${h}:00`);
    }
  });
});

describe("msUntilExpiry", () => {
  test("өнгөрсөн бол 0", () => {
    const created = ub("2026-09-16T10:00");
    assert.equal(msUntilExpiry(created, ub("2026-09-16T13:00")), 0);
  });
  test("үлдсэн хугацааг минутаар", () => {
    const created = ub("2026-09-16T10:00");
    const left = msUntilExpiry(created, ub("2026-09-16T11:00")) / 60_000;
    assert.equal(left, 60);
  });
  test("шөнийн захиалгад өглөө хүртэлх бүх хугацаа", () => {
    const created = ub("2026-09-16T23:00");
    const left = msUntilExpiry(created, ub("2026-09-16T23:30")) / 60_000;
    assert.equal(left, 9 * 60 + 30); // 23:30 → 09:00
  });
});
