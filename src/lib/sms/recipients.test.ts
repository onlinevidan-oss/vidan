import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { broadcastRecipients, parseRecipients, smsSegments } from "./recipients.ts";

describe("parseRecipients", () => {
  test("таслалаар тусгаарласан дугааруудыг задална", () => {
    assert.deepEqual(parseRecipients("94070800, 80012476"), {
      valid: ["94070800", "80012476"],
      invalid: [],
    });
  });

  test("мөр шилжилт, цэг таслал, илүү зайг зөвшөөрнө", () => {
    assert.deepEqual(parseRecipients(" 94070800;\n80012476 ,, ").valid, [
      "94070800",
      "80012476",
    ]);
  });

  test("+976 угтвар болон дотор нь зай, зураастай дугаарыг цэвэрлэнэ", () => {
    assert.deepEqual(parseRecipients("+976 9407-0800, 976 80012476").valid, [
      "94070800",
      "80012476",
    ]);
  });

  test("давхардсан дугаарт нэг л SMS явна", () => {
    assert.deepEqual(parseRecipients("94070800, 94070800").valid, ["94070800"]);
  });

  test("буруу дугаарыг чимээгүй хаяхгүй — тусад нь буцаана", () => {
    assert.deepEqual(parseRecipients("94070800, 9407080, 12345678, abc"), {
      valid: ["94070800"],
      invalid: ["9407080", "12345678", "abc"],
    });
  });

  test("хоосон утга алдаа биш", () => {
    assert.deepEqual(parseRecipients(""), { valid: [], invalid: [] });
    assert.deepEqual(parseRecipients(null), { valid: [], invalid: [] });
  });
});

describe("broadcastRecipients", () => {
  test("ажилтныг хасаж, давхардал ба буруу дугаарыг арилгана", () => {
    const r = broadcastRecipients(
      [
        { id: "a", phone: "99112233" },
        { id: "b", phone: "+976 9911 2233" },
        { id: "c", phone: "94070800" },
        { id: "d", phone: null },
        { id: "e", phone: "12345" },
        { id: "f", phone: "88001122" },
      ],
      new Set(["c"]),
    );
    assert.deepEqual(r, ["99112233", "88001122"]);
  });
});

describe("smsSegments", () => {
  test("' VIDAN' залгаасыг тооцно", () => {
    assert.equal(smsSegments("а".repeat(64)), 1);
    assert.equal(smsSegments("а".repeat(65)), 2);
  });

  test("масс SMS-ийн текст 2 хэсэг", () => {
    assert.equal(
      smsSegments("Захиалга хийгээд азтан болоорой! Дэлгэрэнгүй: https://www.facebook.com/share/p/1CZk2V7kZj/"),
      2,
    );
  });
});
