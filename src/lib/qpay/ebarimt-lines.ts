/**
 * QPay e-barimt 3.0 нэхэмжлэхийн мөр угсрах цэвэр логик.
 *
 * ⚠️ Хамгийн чухал дүрэм: e-barimt нэхэмжлэхэд `amount` талбар БАЙХГҮЙ.
 *    QPay нийт дүнг мөрүүдээс тооцдог тул мөрүүдийн нийлбэр нь захиалгын
 *    төлөх дүнтэй ЯГ таарах ёстой. Тиймээс хөнгөлөлтийг бүхэл төгрөгөөр,
 *    хамгийн их үлдэгдлийн аргаар хуваарилж, дугуйруулалтын зөрүү үлдэхээс
 *    сэргийлнэ.
 *
 * НӨАТ: манай үнэ НӨАТ багтсан (brutto) тул НӨАТ = дүн / 11
 *       (10% НӨАТ: дүн × 10/110). QPay 4 орны дараах цифрийг ДУГУЙРУУЛАХГҮЙ,
 *       ТАСЛАДАГ: 50/11 = 4.545454… → тэдний жишээ 4.5454 (4.5455 биш).
 *       100/11 = 9.090909… → 9.0909. Хоёул таслалтаар л таарна.
 */

/** НӨАТ багтсан дүнгээс НӨАТ-ыг салгах хуваарь (10% НӨАТ) */
const VAT_DIVISOR = 11;

/** QPay мөрийн татварын бичлэг */
export type QpayLineTax = {
  tax_code: "VAT";
  description: string;
  amount: number;
  note: string;
};

/** QPay нэхэмжлэхийн нэг мөр */
export type QpayInvoiceLine = {
  tax_product_code: string;
  line_description: string;
  barcode: string;
  line_quantity: string;
  line_unit_price: string;
  note: string;
  classification_code: string;
  taxes: QpayLineTax[];
};

/** Захиалгын мөрөөс ирэх өгөгдөл */
export type EbarimtSourceItem = {
  name: string;
  quantity: number;
  /** Нэгж үнэ, НӨАТ багтсан, бүхэл төгрөгөөр */
  unitPrice: number;
  barcode?: string | null;
  classificationCode?: string | null;
};

export type BuildLinesInput = {
  items: EbarimtSourceItem[];
  /** Хүргэлтийн төлбөр (0 бол мөр нэмэхгүй) */
  shipping?: number;
  /** Захиалгын түвшний хөнгөлөлт — барааны мөрүүдэд хуваарилагдана */
  discount?: number;
  /**
   * Барааны мөрүүдэд хуваарилах ЯГ энэ дүн (НӨАТ багтсан, бүхэл төгрөг).
   *
   * Манай сайт барааны үнэн дээр НӨАТ-ыг НЭМЖ боддог (unit_price нь цэвэр
   * үнэ), харин и-баримтад НӨАТ багтсан үнэ явах ёстой. Тиймээс дуудагч
   * тал бодит төлөх дүнг энд дамжуулна. Өгвөл `discount` үл хэрэгсэгдэнэ.
   */
  goodsGrossTotal?: number;
  /** Ангиллын код олдохгүй үед ашиглах нөөц код */
  defaultClassificationCode: string;
  /** Хүргэлтийн үйлчилгээний ангиллын код */
  shippingClassificationCode: string;
  shippingName?: string;
};

export type BuildLinesResult = {
  lines: QpayInvoiceLine[];
  /** Мөрүүдээс гарах нийт дүн — захиалгын төлөх дүнтэй таарах ёстой */
  total: number;
  /** Нийт НӨАТ */
  vatTotal: number;
  /** Хуваарилалтын дараа үлдсэн зөрүү — 0 байх ёстой */
  residual: number;
};

/** 4 орны нарийвчлалтай дугуйруулалт — дүн харьцуулахад ашиглана */
export function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10_000) / 10_000;
}

/** 4 орны дараахыг таслана — QPay-ийн НӨАТ бодох арга */
export function trunc4(n: number): number {
  return Math.trunc(round4(n * 10_000)) / 10_000;
}

/** НӨАТ багтсан дүнгээс НӨАТ-ыг тооцно (QPay-ийн адил таслалтаар) */
export function vatFromGross(gross: number): number {
  return trunc4(gross / VAT_DIVISOR);
}

/**
 * Хөнгөлөлтийг мөрүүдийн дүнд пропорциональ, бүхэл төгрөгөөр хуваарилна.
 * Хамгийн их үлдэгдлийн арга — нийлбэр нь зорилтот дүнтэй ЯГ таарна.
 */
export function allocateByLargestRemainder(
  weights: number[],
  target: number,
): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0) return [];
  if (totalWeight <= 0 || target <= 0) {
    // Жин байхгүй бол бүгдийг эхний мөрд өгнө — дүн алдагдахгүй
    return weights.map((_, i) => (i === 0 ? Math.max(0, target) : 0));
  }

  const exact = weights.map((w) => (w / totalWeight) * target);
  const floors = exact.map((v) => Math.floor(v));
  let rest = target - floors.reduce((s, v) => s + v, 0);

  // Бутархай үлдэгдэл нь их мөрүүдэд нэг нэгжээр тарааж өгнө
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = [...floors];
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) {
    out[order[k].i] += 1;
  }
  // rest > order.length байх боломжгүй (floor-ийн зөрүү < мөрийн тоо)
  return out;
}

/**
 * Захиалгаас QPay e-barimt нэхэмжлэхийн мөрүүдийг угсарна.
 *
 * Буцаах `total` нь мөрүүдээс гарах нийт дүн — checkout-д харуулсан
 * захиалгын дүнтэй таарч байгааг дуудагч тал шалгах ёстой.
 */
export function buildEbarimtLines(input: BuildLinesInput): BuildLinesResult {
  const {
    items,
    shipping = 0,
    discount = 0,
    defaultClassificationCode,
    shippingClassificationCode,
    shippingName = "Хүргэлтийн үйлчилгээ",
  } = input;

  const goods = items.filter((it) => it.quantity > 0);

  // 1) Мөр тус бүрийн хөнгөлөлтгүй дүн
  const grossTotals = goods.map((it) => it.unitPrice * it.quantity);
  const goodsTotal = grossTotals.reduce((s, v) => s + v, 0);

  // 2) Барааны мөрүүдэд хуваарилах зорилтот дүн.
  //    goodsGrossTotal өгсөн бол түүнийг шууд ашиглана (НӨАТ багтсан),
  //    эс бөгөөс хөнгөлөлтийг [0, goodsTotal] завсарт таслаж хасна.
  const targetGoods =
    input.goodsGrossTotal !== undefined
      ? Math.max(0, Math.round(input.goodsGrossTotal))
      : goodsTotal -
        Math.max(0, Math.min(Math.round(discount) || 0, goodsTotal));
  const lineTotals = allocateByLargestRemainder(grossTotals, targetGoods);

  const lines: QpayInvoiceLine[] = goods.map((it, i) =>
    makeLine({
      name: it.name,
      quantity: it.quantity,
      lineTotal: lineTotals[i],
      barcode: it.barcode,
      classificationCode: it.classificationCode || defaultClassificationCode,
    }),
  );

  // 3) Хүргэлт — тусдаа мөр. Хөнгөлөлт хүргэлтэд хамаарахгүй.
  const shippingAmount = Math.max(0, Math.round(shipping) || 0);
  if (shippingAmount > 0) {
    lines.push(
      makeLine({
        name: shippingName,
        quantity: 1,
        lineTotal: shippingAmount,
        barcode: null,
        classificationCode: shippingClassificationCode,
      }),
    );
  }

  const total = lines.reduce(
    (s, l) => s + Number(l.line_quantity) * Number(l.line_unit_price),
    0,
  );
  const vatTotal = round4(
    lines.reduce((s, l) => s + (l.taxes[0]?.amount ?? 0), 0),
  );

  return {
    lines,
    total: round4(total),
    vatTotal,
    residual: round4(targetGoods + shippingAmount - total),
  };
}

function makeLine(a: {
  name: string;
  quantity: number;
  lineTotal: number;
  barcode?: string | null;
  classificationCode: string;
}): QpayInvoiceLine {
  // Нэгж үнэ = мөрийн дүн / тоо. Хуваагдахгүй үед 4 орны нарийвчлал
  // хэрэглэнэ — тоо × нэгж үнэ нь мөрийн дүнг эргүүлж өгнө.
  const unitPrice = round4(a.lineTotal / a.quantity);
  return {
    tax_product_code: "",
    line_description: a.name.slice(0, 255),
    barcode: a.barcode ?? "",
    line_quantity: a.quantity.toFixed(2),
    line_unit_price: unitPrice.toFixed(2) === String(unitPrice)
      ? unitPrice.toFixed(2)
      : String(unitPrice),
    note: "",
    classification_code: a.classificationCode,
    taxes: [
      {
        tax_code: "VAT",
        description: "НӨАТ",
        amount: vatFromGross(a.lineTotal),
        note: "НӨАТ",
      },
    ],
  };
}
