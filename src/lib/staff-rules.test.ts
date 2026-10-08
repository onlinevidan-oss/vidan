import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkStaffChange, isStaffRole, phoneVariants } from "./staff-rules.ts";

const admin = { id: "a", role: "admin", is_active: true };
const staff = { id: "s", role: "staff", is_active: true };

describe("checkStaffChange", () => {
  test("өөр ажилтны эрх, төлөвийг өөрчилж болно", () => {
    assert.equal(checkStaffChange({ actorId: "a", target: staff, patch: { role: "manager" }, activeAdminCount: 1 }), null);
    assert.equal(checkStaffChange({ actorId: "a", target: staff, patch: { is_active: false }, activeAdminCount: 1 }), null);
  });

  test("өөрийгөө идэвхгүй болгох, эрхээ өөрчлөхийг хориглоно", () => {
    assert.match(checkStaffChange({ actorId: "a", target: admin, patch: { is_active: false }, activeAdminCount: 2 }) ?? "", /Өөрийгөө/);
    assert.match(checkStaffChange({ actorId: "a", target: admin, patch: { role: "staff" }, activeAdminCount: 2 }) ?? "", /Өөрийнхөө/);
  });

  test("өөр дээрээ утга өөрчлөхгүй хадгалалт алдаа биш", () => {
    assert.equal(checkStaffChange({ actorId: "a", target: admin, patch: { role: "admin", is_active: true }, activeAdminCount: 1 }), null);
  });

  test("сүүлчийн идэвхтэй админыг бууруулах, унтраахыг хориглоно", () => {
    const other = { id: "b", role: "admin", is_active: true };
    assert.match(checkStaffChange({ actorId: "a", target: other, patch: { role: "manager" }, activeAdminCount: 1 }) ?? "", /Сүүлчийн/);
    assert.match(checkStaffChange({ actorId: "a", target: other, patch: { is_active: false }, activeAdminCount: 1 }) ?? "", /Сүүлчийн/);
  });

  test("хоёр админтай бол нэгийг нь бууруулж болно", () => {
    const other = { id: "b", role: "admin", is_active: true };
    assert.equal(checkStaffChange({ actorId: "a", target: other, patch: { role: "manager" }, activeAdminCount: 2 }), null);
  });

  test("идэвхгүй админыг өөрчлөхөд админы тоо хамаарахгүй", () => {
    const off = { id: "b", role: "admin", is_active: false };
    assert.equal(checkStaffChange({ actorId: "a", target: off, patch: { role: "staff" }, activeAdminCount: 1 }), null);
  });
});

describe("туслах", () => {
  test("isStaffRole зөвхөн дөрвөн эрхийг зөвшөөрнө", () => {
    assert.equal(isStaffRole("manager"), true);
    assert.equal(isStaffRole("owner"), false);
    assert.equal(isStaffRole(undefined), false);
  });

  test("phoneVariants — сангийн гурван хэлбэр, түгээмэл нь эхэндээ", () => {
    assert.deepEqual(phoneVariants("94070800"), ["97694070800", "94070800", "+97694070800"]);
  });
});
