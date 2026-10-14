/**
 * Барааны үлдэгдлийн түвшин — хяналтын самбар, хонх, барааны жагсаалт,
 * агуулах, тайлан бүгд энэ НЭГ дүрмээр бодно.
 *
 * Дахин захиалах босго бүх бараанд нэг: 20 ширхэг (эзний шийдвэр,
 * 2026-10-14). Өмнө нь зарим хуудас бараа бүрийн `stock_threshold`-ийг,
 * зарим нь тогтмол 20-ийг ашиглаж, дууссан (0) барааг "дуусч буй"-д хольж
 * тоолдог байсан тул хуудас бүр өөр тоо харуулах эрсдэлтэй байв.
 *
 *  · out — дууссан (0)
 *  · low — дуусч буй, дахин захиалах (1–20)
 *  · ok  — хангалттай
 */

export const LOW_STOCK_LIMIT = 20;

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(stock: number | null | undefined): StockLevel {
  const n = Number(stock) || 0;
  if (n <= 0) return "out";
  if (n <= LOW_STOCK_LIMIT) return "low";
  return "ok";
}
