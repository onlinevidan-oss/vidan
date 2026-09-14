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
): OrderTotals {
  // Хөнгөлөлтийг [0, subtotal] завсарт таслана — DB-ийн calc_order_totals дахь
  // greatest(0, least(discount, subtotal))-тэй яг ижил. Сөрөг утга нийт дүнг
  // нэмэгдүүлэх, дэд дүнгээс их утга хураангуйд буруу тоо харуулахаас сэргийлнэ.
  const clampedDiscount = Math.max(0, Math.min(discount, subtotal));
  const afterDiscount = subtotal - clampedDiscount;
  let shipping = shippingForQty(itemCount, settings);
  if (settings.free_shipping_enabled && afterDiscount >= settings.free_shipping_min) {
    shipping = 0;
  }
  // Бараанд НӨАТ нэмэгдэхгүй (үнэд шингэсэн). Хүргэлтийн үнэн дээр л НӨАТ нэмнэ.
  const tax = shippingVat(shipping);
  const total = afterDiscount + shipping + tax;
  return { subtotal, discount: clampedDiscount, shipping, tax, total };
}
