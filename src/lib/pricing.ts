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

export type CommerceSettings = {
  min_order_amount: number;
  /** threshold ба түүнээс доош ширхэгт хүргэлт */
  shipping_base: number;
  /** threshold-с дээш ширхэгт хүргэлт */
  shipping_over: number;
  /** хүргэлтийн ширхгийн босго (үүнээс дээш бол shipping_over) */
  shipping_qty_threshold: number;
  free_shipping_enabled: boolean;
  free_shipping_min: number;
};

export const COMMERCE_DEFAULTS: CommerceSettings = {
  min_order_amount: 20_000,
  shipping_base: 7_000,
  shipping_over: 14_000,
  shipping_qty_threshold: 7,
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
  let shipping =
    itemCount > settings.shipping_qty_threshold
      ? settings.shipping_over
      : settings.shipping_base;
  if (settings.free_shipping_enabled && afterDiscount >= settings.free_shipping_min) {
    shipping = 0;
  }
  // Бараанд НӨАТ нэмэгдэхгүй (үнэд шингэсэн). Хүргэлтийн үнэн дээр л НӨАТ нэмнэ.
  const tax = shippingVat(shipping);
  const total = afterDiscount + shipping + tax;
  return { subtotal, discount: clampedDiscount, shipping, tax, total };
}
