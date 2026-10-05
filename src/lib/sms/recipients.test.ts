import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseRecipients } from "./recipients.ts";

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
