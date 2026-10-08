/**
 * Барааны SKU — "VIDAN" + дараалсан дугаар (VIDAN001, VIDAN002 …).
 *
 * Өмнө нь SKU чөлөөт текст байсан тул "038" гэх мэт жишигт таарахгүй,
 * дараалал алдагдсан бараа үүсч байв (2026-10-08). Одоо шинэ бараанд
 * дараагийн дугаарыг санал болгож, хадгалахад хэлбэрийг нь шалгана.
 */

const SKU_PREFIX = "VIDAN";
const SKU_PATTERN = /^VIDAN(\d{3,})$/;

/** Формын алдааны мессеж, placeholder-т хэрэглэх жишээ */
export const SKU_HINT = "VIDAN + 3 оронтой тоо (жнь. VIDAN048)";

export function normalizeSku(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSku(raw: string): boolean {
  return SKU_PATTERN.test(normalizeSku(raw));
}

/**
 * Дараагийн SKU — байгаа хамгийн их дугаар + 1.
 *
 * Завсрыг нөхөхгүй: устгагдсан барааны SKU хуучин захиалгын мөрөнд
 * (order_items.product_sku) үлдсэн байдаг тул дахин хэрэглэвэл хоёр өөр
 * бараа нэг дугаартай болно. Жишигт таарахгүй SKU-г тооцохгүй.
 */
export function nextSku(existing: readonly string[]): string {
  let max = 0;
  for (const raw of existing) {
    const m = SKU_PATTERN.exec(normalizeSku(raw));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${SKU_PREFIX}${String(max + 1).padStart(3, "0")}`;
}
