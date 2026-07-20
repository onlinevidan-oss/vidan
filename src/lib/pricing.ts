/**
 * Үнийн тооцоолол — нэг газар төвлөрүүлсэн.
 * Server (place_order RPC) болон client (CartView, CheckoutView)
 * аль аль талд адил тоо гарч ирэхийг баталгаажуулна.
 * DB-ийн `calc_order_totals()` функцтэй адил логиктой.
 */

export const FREE_SHIPPING_MIN = 50_000;
export const SHIPPING_BASE     = 8_000;
export const TAX_RATE          = 0.1;
/** Захиалгын доод дүн — үүнээс бага бол захиалга өгөх боломжгүй */
export const MIN_ORDER_AMOUNT  = 20_000;

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
  discount = 0,
): OrderTotals {
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= FREE_SHIPPING_MIN ? 0 : SHIPPING_BASE;
  const tax      = Math.round(afterDiscount * TAX_RATE);
  const total    = afterDiscount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}

/** Үнэгүй хүргэлт болоход хэр их үлдсэнийг буцаана */
export function freeShippingNeeded(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_MIN - subtotal);
}
