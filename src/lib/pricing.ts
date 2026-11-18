/**
 * Үнийн тооцоолол — нэг газар төвлөрүүлсэн.
 * Server (place_order RPC) болон client (CartView, CheckoutView)
 * аль аль талд адил тоо гарч ирэхийг баталгаажуулна.
 * DB-ийн `calc_order_totals()` функцтэй адил логиктой.
 *
 * Худалдааны тохиргоо (хүргэлт, доод дүн, үнэгүй хүргэлт) админ хэсгээс
 * удирдагддаг — бодит утгыг site_settings('commerce')-оос сервер дээр уншиж
 * (getCommerceSettings), эндэх функцэд дамжуулж өгнө. Доорх DEFAULTS нь
 * зөвхөн тохиргоо олдоогүй үеийн нөөц утга.
 */

export const TAX_RATE = 0.1;

/**
 * ⚠️ НӨАТ-ын дүрэм (эзний эцсийн шийдвэр, 2026-09-14):
 *
 *    · БАРАА — үнэд нь НӨАТ аль хэдийн шингэсэн тул дээр нь НӨАТ БОДОХГҮЙ.
 *    · ХҮРГЭЛТ — хүргэлтийн үнэн дээр НӨАТ 10%-ийг НЭМЖ бодно.
 *
 *      total = (дэд дүн − хөнгөлөлт) + хүргэлт + хүргэлтийн НӨАТ
 *      tax   = хүргэлтийн НӨАТ
 */

/** Дүнд БАГТСАН НӨАТ (brutto → НӨАТ). И-баримтын мөрийн задаргаанд хэрэгтэй. */
export function vatIncludedIn(grossAmount: number): number {
  return Math.round((grossAmount * TAX_RATE) / (1 + TAX_RATE));
}

/** Хүргэлтийн үнэн ДЭЭР нэмэгдэх НӨАТ */
export function shippingVat(shipping: number): number {
  return Math.round(shipping * TAX_RATE);
}

/**
 * Ширхгийн тооноос хүргэлтийн төлбөрийг гаргана (үнэгүй хүргэлтээс өмнө).
 *
 *   1 … threshold      → base            (жнь. 1–7ш   → 7,000₮)
 *   threshold+1 … max  → over            (жнь. 8–15ш  → 14,000₮)
 *   max-аас дээш       → over + step_qty ширхэг тутамд step_price
 *                        (жнь. 16–25ш → 21,000₮ · 26–35ш → 28,000₮)
 */
export function shippingForQty(
  itemCount: number,
  s: CommerceSettings = COMMERCE_DEFAULTS,
): number {
  if (itemCount <= s.shipping_qty_threshold) return s.shipping_base;
  if (itemCount <= s.shipping_tier2_max) return s.shipping_over;
  const stepQty = Math.max(1, s.shipping_step_qty);
  const steps = Math.ceil((itemCount - s.shipping_tier2_max) / stepQty);
  return s.shipping_over + steps * s.shipping_step_price;
}

export type CommerceSettings = {
  min_order_amount: number;
  /** Сагсан дахь ЖИМСНИЙ барааны дүн дангаараа хүрэх ёстой доод хэмжээ (0053) */
  fruit_min_order_amount: number;
  /** 2 дахь хайрцгаас эхлэн хайрцаг бүрт нэмэгдэх хүргэлт, НӨАТ-гүй (0054) */
  fruit_box_extra_fee: number;
  /** threshold ба түүнээс доош ширхэгт хүргэлт */
  shipping_base: number;
  /** threshold-с дээш, tier2_max хүртэл ширхэгт хүргэлт */
  shipping_over: number;
  /** хүргэлтийн ширхгийн босго (үүнээс дээш бол shipping_over) */
  shipping_qty_threshold: number;
  /** 2-р шатны дээд ширхэг — үүнээс дээш бол шатлан нэмэгдэнэ */
  shipping_tier2_max: number;
  /** Дээд шатанд хэдэн ширхэг тутамд нэмэгдэх вэ */
  shipping_step_qty: number;
  /** Тэр ширхэг тутамд нэмэгдэх төлбөр (₮) */
  shipping_step_price: number;
  free_shipping_enabled: boolean;
  free_shipping_min: number;
};

export const COMMERCE_DEFAULTS: CommerceSettings = {
  min_order_amount: 20_000,
  fruit_min_order_amount: 40_000,
  fruit_box_extra_fee: 3_000,
  shipping_base: 7_000,
  shipping_over: 14_000,
  shipping_qty_threshold: 7,
  shipping_tier2_max: 15,
  shipping_step_qty: 10,
  shipping_step_price: 7_000,
  free_shipping_enabled: false,
  free_shipping_min: 50_000,
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  /** Хүргэлтийн үнэн дээр нэмэгдсэн НӨАТ (бараанд НӨАТ нэмэгдэхгүй) */
  tax: number;
  total: number;
};

/**
 * Дэд дүн, ширхгийн тоо, хямдралаас бусдыг тооцоолно.
 * Хүргэлт: сонгосон бүтээгдэхүүний ТОО (ширхэг)-оос хамаарна —
 * босгоос дээш бол shipping_over, эс бол shipping_base.
 *
 * НӨАТ зөвхөн ХҮРГЭЛТЭД нэмэгдэнэ — бараанд нэмэгдэхгүй (үнэд шингэсэн).
 */
export function calculateOrderTotals(
  subtotal: number,
  settings: CommerceSettings = COMMERCE_DEFAULTS,
  itemCount = 0,
  discount = 0,
  /** Эхнийхээс бусад бүтэн хайрцгийн тоо (shippingUnits) — 0054 */
  extraBoxes = 0,
): OrderTotals {
  // Хөнгөлөлтийг [0, subtotal] завсарт таслана — DB-ийн calc_order_totals дахь
  // greatest(0, least(discount, subtotal))-тэй яг ижил. Сөрөг утга нийт дүнг
  // нэмэгдүүлэх, дэд дүнгээс их утга хураангуйд буруу тоо харуулахаас сэргийлнэ.
  const clampedDiscount = Math.max(0, Math.min(discount, subtotal));
  const afterDiscount = subtotal - clampedDiscount;
  let shipping =
    shippingForQty(itemCount, settings) + Math.max(0, extraBoxes) * settings.fruit_box_extra_fee;
  if (settings.free_shipping_enabled && afterDiscount >= settings.free_shipping_min) {
    shipping = 0;
  }
  // Бараанд НӨАТ нэмэгдэхгүй (үнэд шингэсэн). Хүргэлтийн үнэн дээр л НӨАТ нэмнэ.
  const tax = shippingVat(shipping);
  const total = afterDiscount + shipping + tax;
  return { subtotal, discount: clampedDiscount, shipping, tax, total };
}

/**
 * Хөнгөлөлтийн картын (QR, 0049) хөнгөлөлт — DB-ийн card_discount_for ба
 * place_order-той яг ижил: барааны дүнгийн хувь, бүхэлчилсэн; промо
 * кодын хөнгөлөлтийн дараа үлдсэн барааны дүнгээс хэтрэхгүй, сөрөг биш.
 */
export function cardDiscount(
  subtotal: number,
  percent: number,
  promoDiscount = 0,
): number {
  if (!(percent > 0) || !(subtotal > 0)) return 0;
  const raw = Math.round((subtotal * percent) / 100);
  return Math.max(0, Math.min(raw, subtotal - Math.max(0, promoDiscount)));
}

/**
 * Хэрэглэгчид харуулах НӨАТ-ын задаргаа: нийт төлөх дүнд БАГТСАН НӨАТ
 * ба НӨАТ-гүй дүн (мөнгөний 2 оронтой).
 *
 * Бараа ба хүргэлт (хүргэлтийн НӨАТ-тайгаа) бүгд 10%-ийн НӨАТ-тэй тул
 * нийт дүнгийн 10/110 нь НӨАТ — и-баримт дээрх НӨАТ-тай ижил тоо гарна
 * (жнь. 30,100 → НӨАТ 2,736.36, НӨАТ-гүй 27,363.64). Үнийн жагсаалт
 * дахь барааны НӨАТ-ыг ч ийм дүрмээр бодсон (6,500 → 591).
 *
 * Мөнгөөр (×100) бүхэлчилж тооцно — хоёр мөрийн нийлбэр нийт дүнтэй
 * яг тэнцэнэ.
 */
export function vatBreakdown(total: number): { net: number; vat: number } {
  const totalCents = Math.round(total * 100);
  const vatCents = Math.round((totalCents * TAX_RATE) / (1 + TAX_RATE));
  return { net: (totalCents - vatCents) / 100, vat: vatCents / 100 };
}

/**
 * Сагсан дахь жимсний дүн доод хэмжээнд хүрээгүй бол дутуу дүнг буцаана
 * (place_order-ийн FRUIT_MIN_ORDER_NOT_MET-тэй ижил дүрэм, 0053).
 * Жимсгүй сагс эсвэл ажилтан бол 0.
 */
export function fruitShortfall(
  items: { productId: string; price: number; quantity: number }[],
  fruitIds: ReadonlySet<string>,
  minAmount: number,
  isStaff = false,
): { fruitSubtotal: number; shortfall: number } {
  const fruitSubtotal = items
    .filter((i) => fruitIds.has(i.productId))
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const shortfall =
    !isStaff && fruitSubtotal > 0 && fruitSubtotal < minAmount ? minAmount - fruitSubtotal : 0;
  return { fruitSubtotal, shortfall };
}

/**
 * Хүргэлтэд тоологдох ширхэг (0054, place_order-той ижил): бүтэн
 * хайрцгууд (products.shipping_box) нийлээд НЭГ ширхэгт тооцогдож
 * ширхгийн шатлалд орно, үлдсэн хайрцаг бүр `extraBoxes`-д —
 * calculateOrderTotals тэдгээрийг fruit_box_extra_fee-ээр нэмнэ.
 */
export function shippingUnits(
  items: { productId: string; quantity: number }[],
  boxIds: ReadonlySet<string>,
): { count: number; extraBoxes: number } {
  let pieces = 0;
  let boxes = 0;
  for (const i of items) {
    if (boxIds.has(i.productId)) boxes += i.quantity;
    else pieces += i.quantity;
  }
  return { count: pieces + (boxes > 0 ? 1 : 0), extraBoxes: Math.max(0, boxes - 1) };
}
