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
 * ⚠️ Барааны үнэ бүрд НӨАТ АЛЬ ХЭДИЙН ШИНГЭСЭН байдаг (санхүүгээс тодруулсан,
 *    2026-09-14). Тиймээс НӨАТ-ыг нийт дүн дээр НЭМЭХГҮЙ — багтсан НӨАТ-ыг
 *    зөвхөн задалж харуулна: 10% НӨАТ-д багтсан дүнгийн 1/11 нь НӨАТ.
 *    Хүргэлтийн төлбөрт НӨАТ тооцохгүй (өмнөх шийдвэрийн дагуу) — баримт
 *    дээр ч хүргэлт НӨАТ-гүй мөр болж очно.
 */
export function vatIncludedIn(grossAmount: number): number {
  return Math.round((grossAmount * TAX_RATE) / (1 + TAX_RATE));
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
  /** Нийт дүнд БАГТСАН НӨАТ — дээр нь нэмэгддэггүй, зөвхөн задаргаа */
  tax: number;
  total: number;
};

/**
 * Дэд дүн, ширхгийн тоо, хямдралаас бусдыг тооцоолно.
 * Хүргэлт: сонгосон бүтээгдэхүүний ТОО (ширхэг)-оос хамаарна —
 * босгоос дээш бол shipping_over, эс бол shipping_base.
 *
 * НӨАТ нь нийт дүнд БАГТСАН — `tax` нь задаргаа бөгөөд `total`-д нэмэгдэхгүй.
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
  // Үнэд НӨАТ шингэсэн тул нийт дүн = бараа + хүргэлт. НӨАТ дээр нь нэмэгдэхгүй.
  // НӨАТ нь зөвхөн БАРААНЫ дүнд багтсан — хүргэлтэд НӨАТ тооцохгүй.
  const total = afterDiscount + shipping;
  const tax = vatIncludedIn(afterDiscount);
  return { subtotal, discount: clampedDiscount, shipping, tax, total };
}
