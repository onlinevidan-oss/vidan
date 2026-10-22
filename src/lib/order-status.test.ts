/**
 * canShowCourierEnter — "Шивсэн" товч аль захиалгад харагдах вэ.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canShowCourierEnter } from "./order-status.ts";

const o = (payment_status: string, status: string, courier_entered_at: string | null = null) => ({
  payment_status,
  status,
  courier_entered_at,
});

describe("canShowCourierEnter", () => {
  test("төлөгдсөн, хүргэгдээгүй захиалгад харагдана", () => {
    for (const s of ["new", "preparing", "shipping"]) {
      assert.equal(canShowCourierEnter(o("paid", s)), true, s);
    }
  });

  test("хүргэгдсэн, цуцлагдсан, төлөгдөөгүйд харагдахгүй", () => {
    assert.equal(canShowCourierEnter(o("paid", "delivered")), false);
    assert.equal(canShowCourierEnter(o("paid", "cancelled")), false);
    assert.equal(canShowCourierEnter(o("pending", "new")), false);
  });

  test("шивсэн бол хүргэгдсэний дараа ч хэн шивснийг харуулна", () => {
    assert.equal(canShowCourierEnter(o("paid", "delivered", "2026-10-22T13:05:00Z")), true);
  });
});
