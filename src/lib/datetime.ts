/**
 * Цаг хугацааны helpers (Mongolia UTC+8 timezone).
 * Vercel сервер UTC-аар ажилладаг тул дашбоард "өнөөдөр"-ийн заагийг
 * Улаанбаатарт зөв тооцох ёстой.
 */

const MN_TZ_OFFSET_MIN = 8 * 60; // UTC+8

/** Тухайн UTC өдрийн UB цагийн midnight-ыг ISO буцаана */
export function startOfDayMongolia(date: Date = new Date()): Date {
  const utc = date.getTime();
  // UB-д одоогийн цаг
  const ubLocalMs = utc + MN_TZ_OFFSET_MIN * 60_000;
  const ubLocal = new Date(ubLocalMs);
  // UB midnight (тэгшэл)
  const midnightUbLocal = Date.UTC(
    ubLocal.getUTCFullYear(),
    ubLocal.getUTCMonth(),
    ubLocal.getUTCDate(),
  );
  // UTC рүү буцаах
  return new Date(midnightUbLocal - MN_TZ_OFFSET_MIN * 60_000);
}

/** Тухайн UB сарын эхний өдрийн midnight (UTC хэлбэрээр буцаана) */
export function startOfMonthMongolia(date: Date = new Date()): Date {
  const utc = date.getTime();
  const ubLocalMs = utc + MN_TZ_OFFSET_MIN * 60_000;
  const ubLocal = new Date(ubLocalMs);
  const firstUbLocal = Date.UTC(
    ubLocal.getUTCFullYear(),
    ubLocal.getUTCMonth(),
    1,
  );
  return new Date(firstUbLocal - MN_TZ_OFFSET_MIN * 60_000);
}

/** "Yyyy-mm-dd" буцаана (UB өдрөөр) */
export function ubDateKey(date: Date = new Date()): string {
  const ubLocalMs = date.getTime() + MN_TZ_OFFSET_MIN * 60_000;
  return new Date(ubLocalMs).toISOString().slice(0, 10);
}
