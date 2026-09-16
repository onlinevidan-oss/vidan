import { test, describe } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";

/**
 * LinkBuilder нь QR-ыг `QRCode.create()`-ийн зурвасаас SVG болгож
 * ӨӨРӨӨ зурдаг (async `toDataURL` нь анивчилт үүсгэдэг тул).
 *
 * Хамгийн аюултай алдаа: мөр/баганыг сольж бичих. Тийм QR нь
 * харахад яг ижил төстэй боловч уншигдахгүй — сав баглаа дээр
 * хэвлэгдсэний дараа л илэрнэ. Тиймээс индексжүүлэлтийг санд
 * өөрт нь тулгаж шалгана.
 */
describe("QR зурах индексжүүлэлт", () => {
  const link = "https://www.vidan.mn/?utm_source=qr&utm_medium=offline";

  test("data[y * size + x] нь санхны get(row, col)-тэй таарна", () => {
    const q = QRCode.create(link, { errorCorrectionLevel: "M" });
    const size = q.modules.size;
    const bits = q.modules.data;

    let checked = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // get(row, col) — санхны өөрийн дараалал
        const fromApi = q.modules.get(y, x);
        const fromFlat = bits[y * size + x];
        assert.equal(
          Boolean(fromFlat),
          Boolean(fromApi),
          `(мөр ${y}, багана ${x}) зөрж байна`,
        );
        checked++;
      }
    }
    assert.ok(checked > 400, "хангалттай эс шалгагдсан");
  });

  test("матриц тэгш өнцөгт биш, дөрвөлжин", () => {
    const q = QRCode.create(link, { errorCorrectionLevel: "M" });
    assert.equal(q.modules.data.length, q.modules.size * q.modules.size);
  });

  test("гурван булан дээр хайгчийн хээ, дөрөв дэх дээр нь байхгүй", () => {
    // Хэрэв мөр/багана солигдвол энэ шалгалт өнгөрнө — гэхдээ дээрх
    // тулгалт тэр алдааг барина. Энэ нь зурвас жинхэнэ QR мөн эсэх
    // ерөнхий шалгалт.
    const q = QRCode.create(link, { errorCorrectionLevel: "M" });
    const n = q.modules.size;
    const finder = (r0: number, c0: number) => {
      // Хайгчийн хээний гадна хүрээ бүхэлдээ бараан байна
      for (let i = 0; i < 7; i++) {
        if (!q.modules.get(r0, c0 + i)) return false;
        if (!q.modules.get(r0 + 6, c0 + i)) return false;
        if (!q.modules.get(r0 + i, c0)) return false;
        if (!q.modules.get(r0 + i, c0 + 6)) return false;
      }
      return true;
    };
    assert.ok(finder(0, 0), "зүүн дээд");
    assert.ok(finder(0, n - 7), "баруун дээд");
    assert.ok(finder(n - 7, 0), "зүүн доод");
    assert.equal(finder(n - 7, n - 7), false, "баруун доод хээтэй байх ёсгүй");
  });

  test("өөр холбоос өөр зурвас өгнө", () => {
    const a = QRCode.create("https://www.vidan.mn/?utm_source=qr", {});
    const b = QRCode.create("https://www.vidan.mn/?utm_source=sms", {});
    assert.notDeepEqual([...a.modules.data], [...b.modules.data]);
  });
});
