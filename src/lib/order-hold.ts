/**
 * Төлөгдөөгүй захиалгыг хэдий хүртэл нөөцлөх вэ.
 *
 * ХЭМЖИЛТ (2026-09-17): захиалгыг цагаар нь ангилахад —
 *   09:00–12:00   8 захиалга, 25% төлсөн, алдсан   519,895₮
 *   12:00–18:00  23 захиалга, 13% төлсөн, алдсан   800,121₮
 *   18:00–22:00  16 захиалга, 25% төлсөн, алдсан   483,170₮
 *   22:00–09:00  11 захиалга, 18% төлсөн, алдсан 1,916,808₮  ←
 * Шөнийн 11 захиалга нийт алдагдлын 51%-ийг эзэлж байв.
 *
 * ШАЛТГААН: захиалга 120 минутын дараа автоматаар цуцлагддаг. Шөнийн
 * 23:03-д өгсөн 379,900₮-ийн захиалга (#10306) шөнийн 01:15-д
 * цуцлагдсан — захиалагч унтаж байх үед. Өглөө сэрээд төлөх гэхэд
 * захиалга нь аль хэдийн алга болсон байна.
 *
 * ШИЙДЭЛ: шөнийн цагт цуцлахгүй. Өглөө 09:00 хүртэл хүлээнэ.
 * Нөөц шөнөжин баригдана гэсэн үг ч шөнө хүргэлт байхгүй, шөнийн
 * захиалга ховор тул бодит зардал бага.
 *
 * ⚠️ ЭНЭ ДҮРЭМ ГУРВАН ГАЗАР ИЖИЛ БАЙХ ЁСТОЙ:
 *   1. release_stale_orders() — жинхэнэ цуцлалт (эх сурвалж)
 *   2. энэ файл — тоолуур ба сануулгын текст
 *   3. QpayPayment — хэрэглэгчид харуулах тоолуур
 * Зөрвөл хэрэглэгчид "хугацаа дууслаа" гэж худал хэлж, төлөхөө
 * болино — эсвэл эсрэгээр, дууссан захиалгыг амьд мэт харуулна.
 */

/** Захиалга үүссэнээс хойш ийм хугацаанд төлөгдөх ёстой */
export const HOLD_MINUTES = 120;

/** UB цагаар цуцлалт хийгддэг цонх — [эхлэл, төгсгөл) */
export const CANCEL_WINDOW_START_HOUR = 9;
export const CANCEL_WINDOW_END_HOUR = 22;

const MN_TZ_OFFSET_MS = 8 * 60 * 60_000;

/** Тухайн агшны UB цагаар хэдэн цаг болж байгаа вэ (0–23) */
export function ubHour(at: Date): number {
  return new Date(at.getTime() + MN_TZ_OFFSET_MS).getUTCHours();
}

/** Цуцлалт хийгддэг цагийн хооронд уу */
export function isCancelWindow(at: Date): boolean {
  const h = ubHour(at);
  return h >= CANCEL_WINDOW_START_HOUR && h < CANCEL_WINDOW_END_HOUR;
}

/**
 * Захиалга хэзээ цуцлагдах вэ.
 *
 * `created + 120 мин` нь цуцлалтын цонхонд байвал тэр агшин.
 * Шөнө таарвал дараагийн өглөөний 09:00 хүртэл сунгана.
 */
export function orderExpiresAt(createdAt: Date): Date {
  const base = new Date(createdAt.getTime() + HOLD_MINUTES * 60_000);
  if (isCancelWindow(base)) return base;

  // Шөнийн цагт унасан — дараагийн 09:00 UB хүртэл сунгана.
  const ubLocal = new Date(base.getTime() + MN_TZ_OFFSET_MS);
  const h = ubLocal.getUTCHours();
  // 22:00–23:59 бол маргааш, 00:00–08:59 бол мөнөөх өдрийнхөө өглөө
  const dayShift = h >= CANCEL_WINDOW_END_HOUR ? 1 : 0;
  const morning = Date.UTC(
    ubLocal.getUTCFullYear(),
    ubLocal.getUTCMonth(),
    ubLocal.getUTCDate() + dayShift,
    CANCEL_WINDOW_START_HOUR,
  );
  return new Date(morning - MN_TZ_OFFSET_MS);
}

/** Захиалга цуцлагдтал хэдэн миллисекунд үлдсэн (өнгөрсөн бол 0) */
export function msUntilExpiry(createdAt: Date, now: Date = new Date()): number {
  return Math.max(0, orderExpiresAt(createdAt).getTime() - now.getTime());
}
