import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  contentBounds,
  fitPlacement,
  hasWhiteBackground,
  IMAGE_FILL,
  IMAGE_SIZE,
} from "./image-fit.ts";

/** w×h хэмжээтэй, нэг өнгөөр дүүргэсэн RGBA зураг */
function solid(w: number, h: number, rgb: [number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([...rgb, 255], i * 4);
  return data;
}

/** Тэгш өнцөгтийг өнгөөр будна (right/bottom exclusive) */
function paint(
  data: Uint8ClampedArray,
  w: number,
  rect: { left: number; top: number; right: number; bottom: number },
  rgb: [number, number, number],
) {
  for (let y = rect.top; y < rect.bottom; y++) {
    for (let x = rect.left; x < rect.right; x++) {
      data.set([...rgb, 255], (y * w + x) * 4);
    }
  }
}

const WHITE: [number, number, number] = [255, 255, 255];
const GREEN: [number, number, number] = [60, 120, 40];

describe("hasWhiteBackground", () => {
  test("цагаан дэвсгэр дээрх бараа", () => {
    const img = solid(20, 30, WHITE);
    paint(img, 20, { left: 6, top: 4, right: 14, bottom: 26 }, GREEN);
    assert.equal(hasWhiteBackground(img, 20, 30), true);
  });

  test("JPEG-ийн шуугиантай бараг цагаан дэвсгэрийг цагаан гэж үзнэ", () => {
    assert.equal(hasWhiteBackground(solid(20, 20, [247, 249, 246]), 20, 20), true);
  });

  test("студийн саарал дэвсгэр цагаан биш", () => {
    // Гаднаас авсан зурагт их тохиолддог (#d9d7da)
    assert.equal(hasWhiteBackground(solid(20, 20, [217, 215, 218]), 20, 20), false);
  });

  test("гар утсаар өнгөт ширээн дээр авсан зураг цагаан биш", () => {
    // 2026-10-08: дээд тал нь өрөөний саарал, доод тал нь цэнхэр ширээ
    const img = solid(20, 20, [190, 186, 175]);
    paint(img, 20, { left: 0, top: 12, right: 20, bottom: 20 }, [40, 70, 190]);
    assert.equal(hasWhiteBackground(img, 20, 20), false);
  });

  test("бараа доод ирмэгт бага зэрэг тулсан ч дэвсгэр цагаан хэвээр", () => {
    const img = solid(40, 40, WHITE);
    paint(img, 40, { left: 16, top: 5, right: 24, bottom: 40 }, GREEN);
    assert.equal(hasWhiteBackground(img, 40, 40), true);
  });
});

describe("contentBounds", () => {
  test("барааны яг хүрээг олно", () => {
    const img = solid(20, 30, WHITE);
    const rect = { left: 6, top: 4, right: 14, bottom: 26 };
    paint(img, 20, rect, GREEN);
    assert.deepEqual(contentBounds(img, 20, 30), rect);
  });

  test("бараг цагаан пикселийг агуулгад тооцохгүй", () => {
    const img = solid(20, 20, WHITE);
    paint(img, 20, { left: 0, top: 0, right: 3, bottom: 3 }, [244, 246, 243]);
    paint(img, 20, { left: 8, top: 8, right: 12, bottom: 15 }, GREEN);
    assert.deepEqual(contentBounds(img, 20, 20), {
      left: 8,
      top: 8,
      right: 12,
      bottom: 15,
    });
  });

  test("бүхэлдээ цагаан зурагт хүрээ байхгүй", () => {
    assert.equal(contentBounds(solid(10, 10, WHITE), 10, 10), null);
  });
});

describe("fitPlacement", () => {
  test("өндөр лонх өндрөөрөө 90% эзэлж төвлөрнө", () => {
    const p = fitPlacement({ width: 773, height: 1330 });
    assert.equal(p.height, Math.round(IMAGE_SIZE * IMAGE_FILL));
    // төвлөрсөн (сондгой зөрүүнд 1px уучилна)
    assert.ok(Math.abs(p.y * 2 + p.height - IMAGE_SIZE) <= 1);
    assert.ok(Math.abs(p.x * 2 + p.width - IMAGE_SIZE) <= 1);
    // харьцаа хадгалагдана — шошго гажихгүй
    assert.ok(Math.abs(p.width / p.height - 773 / 1330) < 0.005);
  });

  test("хавтгай өргөн сав өргөнөөрөө хязгаарлагдаж, зурагнаас гарахгүй", () => {
    const p = fitPlacement({ width: 1200, height: 400 });
    assert.equal(p.width, Math.round(IMAGE_SIZE * IMAGE_FILL));
    assert.ok(p.x >= 0 && p.y >= 0);
    assert.ok(p.y + p.height <= IMAGE_SIZE);
  });

  test("жижиг зургийг томруулж ижил хэмжээнд хүргэнэ", () => {
    const p = fitPlacement({ width: 139, height: 447 });
    assert.equal(p.height, Math.round(IMAGE_SIZE * IMAGE_FILL));
  });

  test("хэмжээ, дүүргэлтийг өөрчилж болно", () => {
    assert.deepEqual(fitPlacement({ width: 50, height: 100 }, 200, 0.5), {
      x: 75,
      y: 50,
      width: 50,
      height: 100,
    });
  });
});
