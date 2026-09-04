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

/** UB цагаар тухайн агшны он, сар (1–12), өдөр */
export function ubParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const ubLocal = new Date(date.getTime() + MN_TZ_OFFSET_MIN * 60_000);
  return {
    year: ubLocal.getUTCFullYear(),
    month: ubLocal.getUTCMonth() + 1,
    day: ubLocal.getUTCDate(),
  };
}

/** "YYYY-MM-DD" (UB өдөр) → тэр өдрийн UB 00:00 агшин, UTC Date хэлбэрээр */
export function ubDayStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - MN_TZ_OFFSET_MIN * 60_000);
}

/** он/сар/өдөр → "YYYY-MM-DD" */
export function ubKeyOf(year: number, month: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}

/** Тухайн сард хэдэн хоног байгаа (1–12 сар) */
export function ubDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "YYYY-MM-DD" дээр хоног нэмэх/хасах */
export function ubAddDays(key: string, delta: number): string {
  return ubDateKey(new Date(ubDayStart(key).getTime() + delta * 86_400_000));
}
