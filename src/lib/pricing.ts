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
  tax: number;
  total: number;
};

/**
 * Дэд дүн, ширхгийн тоо, хямдралаас бусдыг тооцоолно.
 * Хүргэлт: сонгосон бүтээгдэхүүний ТОО (ширхэг)-оос хамаарна —
 * босгоос дээш бол shipping_over, эс бол shipping_base.
 */
export function calculateOrderTotals(
  subtotal: number,
  settings: CommerceSettings = COMMERCE_DEFAULTS,
  itemCount = 0,
  discount = 0,
): OrderTotals {
  const afterDiscount = Math.max(0, subtotal - discount);
  let shipping =
    itemCount > settings.shipping_qty_threshold
      ? settings.shipping_over
      : settings.shipping_base;
  if (settings.free_shipping_enabled && afterDiscount >= settings.free_shipping_min) {
    shipping = 0;
  }
  const tax = Math.round(afterDiscount * TAX_RATE);
  const total = afterDiscount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}
