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
  shipping_base: number;
  free_shipping_enabled: boolean;
  free_shipping_min: number;
};

export const COMMERCE_DEFAULTS: CommerceSettings = {
  min_order_amount: 20_000,
  shipping_base: 8_000,
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

/** Дэд дүн ба хямдралаас бусдыг тооцоолно */
export function calculateOrderTotals(
  subtotal: number,
  settings: CommerceSettings = COMMERCE_DEFAULTS,
  discount = 0,
): OrderTotals {
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping =
    settings.free_shipping_enabled && afterDiscount >= settings.free_shipping_min
      ? 0
      : settings.shipping_base;
  const tax = Math.round(afterDiscount * TAX_RATE);
  const total = afterDiscount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}
