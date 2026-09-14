/**
 * E-barimt нэхэмжлэхийн мөрийн тест.
 *
 * Эдгээр тоо шууд татварын албанд очдог — мөрүүдийн нийлбэр захиалгын
 * дүнтэй таарахгүй бол хэрэглэгч буруу дүнгээр баримт авна.
 *
 * Ажиллуулах:  pnpm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  allocateByLargestRemainder,
  buildEbarimtLines,
  round4,
  vatFromGross,
  type EbarimtSourceItem,
} from "./ebarimt-lines.ts";

const DEFAULTS = {
  defaultClassificationCode: "9999999",
  shippingClassificationCode: "6512000",
};

const item = (o: Partial<EbarimtSourceItem> = {}): EbarimtSourceItem => ({
  name: "Тест бараа",
  quantity: 1,
  unitPrice: 10_000,
  barcode: "8656000000001",
  classificationCode: "2149290",
  ...o,
});

/** Мөрүүдээс гарах нийт дүн */
const sum = (lines: { line_quantity: string; line_unit_price: string }[]) =>
  round4(
    lines.reduce(
      (s, l) => s + Number(l.line_quantity) * Number(l.line_unit_price),
      0,
    ),
  );

describe("vatFromGross", () => {
  test("QPay-ийн жишээтэй таарна (50 → 4.5454)", () => {
    assert.equal(vatFromGross(50), 4.5454);
  });

  test("QPay-ийн жишээтэй таарна (100 → 9.0909)", () => {
    assert.equal(vatFromGross(100), 9.0909);
  });

  test("НӨАТ нь дүнгийн 1/11 — 11,000₮ → яг 1,000₮", () => {
    assert.equal(vatFromGross(11_000), 1000);
  });

  test("тэг дүнд НӨАТ тэг", () => {
    assert.equal(vatFromGross(0), 0);
  });
});

describe("allocateByLargestRemainder", () => {
  test("нийлбэр нь зорилтот дүнтэй ЯГ таарна", () => {
    const out = allocateByLargestRemainder([100, 200, 300], 500);
    assert.equal(out.reduce((s, v) => s + v, 0), 500);
  });

  test("хуваагдахгүй тохиолдолд ч нийлбэр таарна", () => {
    const out = allocateByLargestRemainder([1, 1, 1], 100);
    assert.equal(out.reduce((s, v) => s + v, 0), 100);
    assert.deepEqual(out.sort((a, b) => a - b), [33, 33, 34]);
  });

  test("бүгд бүхэл тоо буцаана", () => {
    const out = allocateByLargestRemainder([7, 13, 29], 997);
    out.forEach((v) => assert.equal(Number.isInteger(v), true));
    assert.equal(out.reduce((s, v) => s + v, 0), 997);
  });

  test("жин тэг үед дүн алдагдахгүй", () => {
    const out = allocateByLargestRemainder([0, 0], 500);
    assert.equal(out.reduce((s, v) => s + v, 0), 500);
  });

  test("хоосон жагсаалт", () => {
    assert.deepEqual(allocateByLargestRemainder([], 100), []);
  });
});

describe("buildEbarimtLines — нийт дүн", () => {
  test("хөнгөлөлтгүй үед барааны дүн хэвээрээ", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 12_500, quantity: 2 })],
      ...DEFAULTS,
    });
    assert.equal(r.total, 25_000);
    assert.equal(r.residual, 0);
  });

  test("хүргэлт тусдаа мөр болж нэмэгдэнэ", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 10_000 })],
      shipping: 7_000,
      ...DEFAULTS,
    });
    assert.equal(r.lines.length, 2);
    assert.equal(r.total, 17_000);
    assert.equal(r.lines[1].line_description, "Хүргэлтийн үйлчилгээ");
    assert.equal(r.lines[1].classification_code, "6512000");
  });

  test("хүргэлт 0 бол мөр нэмэхгүй", () => {
    const r = buildEbarimtLines({ items: [item()], shipping: 0, ...DEFAULTS });
    assert.equal(r.lines.length, 1);
  });

  test("хөнгөлөлт хасагдаж, нийлбэр ЯГ таарна", () => {
    const r = buildEbarimtLines({
      items: [
        item({ unitPrice: 10_000, quantity: 1 }),
        item({ unitPrice: 15_000, quantity: 2 }),
      ],
      discount: 5_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 35_000); // 40,000 - 5,000
    assert.equal(r.residual, 0);
  });

  test("хөнгөлөлт хүргэлтэд хамаарахгүй", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 20_000 })],
      shipping: 7_000,
      discount: 5_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 22_000); // (20,000 - 5,000) + 7,000
  });

  test("хуваагдахгүй хөнгөлөлт ч зөрүү үлдээхгүй", () => {
    const r = buildEbarimtLines({
      items: [
        item({ unitPrice: 3_300, quantity: 1 }),
        item({ unitPrice: 3_300, quantity: 1 }),
        item({ unitPrice: 3_300, quantity: 1 }),
      ],
      discount: 1_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 8_900); // 9,900 - 1,000
    assert.equal(r.residual, 0);
    assert.equal(sum(r.lines), 8_900);
  });

  test("хөнгөлөлт барааны дүнгээс хэтэрвэл тасарна", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 5_000 })],
      discount: 99_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 0);
    assert.equal(r.residual, 0);
  });

  test("сөрөг хөнгөлөлт нөлөөлөхгүй", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 5_000 })],
      discount: -100,
      ...DEFAULTS,
    });
    assert.equal(r.total, 5_000);
  });

  test("тоонд хуваагдахгүй дүн — зөрүү 1 мөнгөнөөс бага", () => {
    // 9,998 / 3 = 3,332.6667 → 3 × 3,332.6667 = 9,998.0001
    // QPay нэхэмжлэхийг 2 орноор харуулдаг тул энэ зөрүү харагдахгүй.
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 3_333, quantity: 3 })],
      discount: 1,
      ...DEFAULTS,
    });
    assert.ok(
      Math.abs(r.residual) < 0.01,
      `зөрүү хэт их: ${r.residual}`,
    );
    assert.equal(Math.round(r.total), 9_998);
  });

  test("тоонд жигд хуваагдах дүнд зөрүү огт үлдэхгүй", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 3_000, quantity: 4 })],
      discount: 2_000,
      ...DEFAULTS,
    });
    assert.equal(r.residual, 0);
    assert.equal(r.total, 10_000);
    assert.equal(sum(r.lines), 10_000);
  });
});

describe("buildEbarimtLines — мөрийн талбарууд", () => {
  test("QPay-ийн шаардсан талбарууд бүгд байна", () => {
    const r = buildEbarimtLines({ items: [item()], ...DEFAULTS });
    const l = r.lines[0];
    assert.deepEqual(Object.keys(l).sort(), [
      "barcode",
      "classification_code",
      "line_description",
      "line_quantity",
      "line_unit_price",
      "note",
      "tax_product_code",
      "taxes",
    ]);
    assert.equal(l.taxes[0].tax_code, "VAT");
    assert.equal(l.taxes[0].description, "НӨАТ");
  });

  test("тоо ширхэг 2 орны бутархайтай — QPay загвартай ижил", () => {
    const r = buildEbarimtLines({
      items: [item({ quantity: 5 })],
      ...DEFAULTS,
    });
    assert.equal(r.lines[0].line_quantity, "5.00");
  });

  test("ангиллын код байхгүй бол нөөц код орно", () => {
    const r = buildEbarimtLines({
      items: [item({ classificationCode: null })],
      ...DEFAULTS,
    });
    assert.equal(r.lines[0].classification_code, "9999999");
  });

  test("баркод байхгүй бол хоосон мөр", () => {
    const r = buildEbarimtLines({
      items: [item({ barcode: null })],
      ...DEFAULTS,
    });
    assert.equal(r.lines[0].barcode, "");
  });

  test("урт нэр 255 тэмдэгтээр таслагдана", () => {
    const r = buildEbarimtLines({
      items: [item({ name: "а".repeat(400) })],
      ...DEFAULTS,
    });
    assert.equal(r.lines[0].line_description.length, 255);
  });

  test("тоо 0 бараа мөр үүсгэхгүй", () => {
    const r = buildEbarimtLines({
      items: [item({ quantity: 0 }), item({ quantity: 2 })],
      ...DEFAULTS,
    });
    assert.equal(r.lines.length, 1);
  });
});

describe("buildEbarimtLines — НӨАТ", () => {
  test("мөр бүр НӨАТ-той — хүргэлт ч мөн адил", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 11_000, quantity: 2 })],
      shipping: 11_000, // НӨАТ нэмсэн дүн
      ...DEFAULTS,
    });
    assert.equal(r.total, 33_000);
    assert.equal(r.vatTotal, 3_000, "33,000-д багтсан НӨАТ");
  });

  test("хүргэлтийн мөр НӨАТ-ын бичлэгтэй", () => {
    // shipping нь НӨАТ НЭМСЭН дүнгээр ирнэ: 7,000 + 700 = 7,700
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 10_000 })],
      shipping: 7_700,
      ...DEFAULTS,
    });
    assert.equal(r.lines[1].taxes.length, 1);
    assert.equal(r.lines[1].taxes[0].amount, 700, "7,700 / 11");
    assert.equal(r.lines[0].taxes.length, 1);
  });

  test("мөр бүрийн НӨАТ 4 орноос хэтрэхгүй", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 4_900, quantity: 3 })],
      ...DEFAULTS,
    });
    const amount = r.lines[0].taxes[0].amount;
    assert.equal(amount, round4(14_700 / 11));
    const decimals = String(amount).split(".")[1]?.length ?? 0;
    assert.ok(decimals <= 4, `${amount} нь 4-өөс олон оронтой байна`);
  });
});

describe("buildEbarimtLines — бодит захиалга", () => {
  test("#10299 маягийн олон мөртэй захиалга таарна", () => {
    const items: EbarimtSourceItem[] = [
      item({ name: "Алимны нухаш 200г", unitPrice: 5_900, quantity: 5 }),
      item({ name: "Алим, Чангаанз 200г", unitPrice: 6_200, quantity: 5 }),
      item({ name: "Махны Мангас 180г", unitPrice: 9_800, quantity: 5 }),
      item({ name: "Хүрэн манжин Смүүти 270мл", unitPrice: 4_500, quantity: 5 }),
    ];
    const r = buildEbarimtLines({
      items,
      shipping: 7_000,
      discount: 12_345,
      ...DEFAULTS,
    });
    const goods = 5 * (5_900 + 6_200 + 9_800 + 4_500);
    assert.equal(r.total, goods - 12_345 + 7_000);
    assert.equal(r.residual, 0);
    assert.equal(sum(r.lines), r.total);
    assert.equal(r.lines.length, 5);
  });

  test("бараагүй захиалгад зөвхөн хүргэлт үлдэнэ", () => {
    const r = buildEbarimtLines({ items: [], shipping: 7_000, ...DEFAULTS });
    assert.equal(r.lines.length, 1);
    assert.equal(r.total, 7_000);
  });
});

describe("buildEbarimtLines — goodsGrossTotal (НӨАТ багтсан дүн)", () => {
  // ⚠️ Манай сайт барааны цэвэр үнэн дээр НӨАТ 10%-ийг НЭМЖ боддог.
  // И-баримтад НӨАТ багтсан үнэ явах ёстой тул зорилтот дүнг гаднаас өгнө.
  test("өгсөн дүнг мөрүүдэд яг хуваарилна", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 10_000, quantity: 1 })],
      goodsGrossTotal: 11_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 11_000);
    assert.equal(r.lines[0].line_unit_price, "11000");
  });

  test("хүргэлт дээр нь нэмэгдэнэ", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 10_000 })],
      goodsGrossTotal: 11_000,
      shipping: 7_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, 18_000);
  });

  test("өгсөн үед discount үл хэрэгсэгдэнэ", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 10_000 })],
      goodsGrossTotal: 11_000,
      discount: 9_999,
      ...DEFAULTS,
    });
    assert.equal(r.total, 11_000);
  });

  test("#10299 маягийн бодит захиалга — цэвэр үнэ → НӨАТ багтсан", () => {
    // Дэд дүн 252,250 (НӨАТ-гүй) + НӨАТ 25,225 + хүргэлт 14,000 = 291,475
    const items = [
      item({ unitPrice: 6_100, quantity: 5 }),
      item({ unitPrice: 4_600, quantity: 5 }),
      item({ unitPrice: 40_150, quantity: 1 }),
    ];
    const subtotal = 5 * 6_100 + 5 * 4_600 + 40_150;
    const grossGoods = subtotal + Math.round(subtotal * 0.1);
    const r = buildEbarimtLines({
      items,
      goodsGrossTotal: grossGoods,
      shipping: 14_000,
      ...DEFAULTS,
    });
    assert.equal(r.total, grossGoods + 14_000);
    assert.equal(r.residual, 0);
    // Мөр бүр НӨАТ-той — нийт НӨАТ нь нийт дүнгийн 1/11
    assert.ok(Math.abs(r.vatTotal - (grossGoods + 14_000) / 11) < 0.01);
  });

  test("тэг дүн өгвөл мөрүүд тэг болно", () => {
    const r = buildEbarimtLines({
      items: [item({ unitPrice: 5_000 })],
      goodsGrossTotal: 0,
      ...DEFAULTS,
    });
    assert.equal(r.total, 0);
  });
});
