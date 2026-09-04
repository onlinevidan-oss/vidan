/**
 * Тайлангийн хугацааны сонголт — цэвэр логик.
 *
 * Санхүүд сард ХОЁР удаа тайлан өгдөг тул үндсэн нэгж нь хагас сар:
 * 1–15 ба 16-наас сарын сүүл. Бүх огноо Улаанбаатарын цагаар (UTC+8)
 * тооцогдоно — Vercel сервер UTC-аар ажилладаг тул шууд `new Date()`
 * ашиглавал шөнө дунд орчимд өдөр нэгээр гулсана.
 */
import {
  ubAddDays,
  ubDateKey,
  ubDayStart,
  ubDaysInMonth,
  ubKeyOf,
  ubParts,
} from "./datetime.ts";

export const PERIOD_PRESETS = [
  "this-first",
  "this-second",
  "prev-first",
  "prev-second",
  "last30",
  "all",
] as const;

/**
 * Тайлангийн хуудсанд харуулах сонголтууд — "Бүх хугацаа" энд ОРОХГҮЙ.
 * Учир нь орлогын графикт өдөр бүр цэг зурдаг тул хэдэн жилийн завсар
 * утгагүй урт болно. Агуулахын хуудсанд график байхгүй тул тэнд бүгд гарна.
 */
export const REPORT_PRESETS = PERIOD_PRESETS.filter(
  (p) => p !== "all",
) as readonly PeriodPreset[];

/** "Бүх хугацаа"-гийн доод хязгаар — дэлгүүр үүсэхээс өмнөх огноо */
const EPOCH = "2020-01-01";

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PRESET_LABEL: Record<PeriodPreset, string> = {
  "this-first": "Энэ сарын 1–15",
  "this-second": "Энэ сарын 16-наас сүүл",
  "prev-first": "Өнгөрсөн сарын 1–15",
  "prev-second": "Өнгөрсөн сарын 16-наас сүүл",
  last30: "Сүүлийн 30 хоног",
  all: "Бүх хугацаа",
};

export type ReportPeriod = {
  /** Сонгосон preset, эсвэл гараар оруулсан бол "custom" */
  preset: PeriodPreset | "custom";
  /** UB өдөр, "YYYY-MM-DD" — эхлэл (оролцоно) */
  from: string;
  /** UB өдөр, "YYYY-MM-DD" — төгсгөл (оролцоно) */
  to: string;
  /** Хүн уншихад зориулсан нэр — тайлангийн толгойд ба хэвлэхэд */
  label: string;
  /** Хугацаанд хамрагдах хоногийн тоо */
  days: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Огнооны мөр хүчинтэй эсэх (форматтай бөгөөд бодит өдөр) */
export function isValidDateKey(key: string | undefined | null): key is string {
  if (!key || !DATE_RE.test(key)) return false;
  return ubDateKey(ubDayStart(key)) === key;
}

/** Өмнөх сарыг буцаана (1-р сараас өмнөх нь өнгөрсөн оны 12-р сар) */
function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** Preset → огнооны завсар */
function rangeOfPreset(
  preset: PeriodPreset,
  now: Date,
): { from: string; to: string } {
  const today = ubParts(now);

  if (preset === "all") {
    return { from: EPOCH, to: ubKeyOf(today.year, today.month, today.day) };
  }

  if (preset === "last30") {
    const to = ubKeyOf(today.year, today.month, today.day);
    return { from: ubAddDays(to, -29), to };
  }

  const isPrev = preset === "prev-first" || preset === "prev-second";
  const { year, month } = isPrev
    ? prevMonth(today.year, today.month)
    : { year: today.year, month: today.month };

  const firstHalf = preset === "this-first" || preset === "prev-first";
  return firstHalf
    ? { from: ubKeyOf(year, month, 1), to: ubKeyOf(year, month, 15) }
    : {
        from: ubKeyOf(year, month, 16),
        to: ubKeyOf(year, month, ubDaysInMonth(year, month)),
      };
}

/** Хугацааг хүн уншихаар бичих */
export function formatPeriodLabel(from: string, to: string): string {
  const a = from.split("-").map(Number);
  const b = to.split("-").map(Number);
  const [ya, ma, da] = a;
  const [yb, mb, db] = b;

  if (ya === yb && ma === mb) {
    return da === db
      ? `${ya} оны ${ma}-р сарын ${da}`
      : `${ya} оны ${ma}-р сарын ${da}–${db}`;
  }
  if (ya === yb) {
    return `${ya} оны ${ma}-р сарын ${da} – ${mb}-р сарын ${db}`;
  }
  return `${ya}.${String(ma).padStart(2, "0")}.${String(da).padStart(2, "0")} – ${yb}.${String(mb).padStart(2, "0")}.${String(db).padStart(2, "0")}`;
}

/** Хоёр огнооны хоорондох хоногийн тоо (хоёул оролцоно) */
export function daysBetween(from: string, to: string): number {
  const ms = ubDayStart(to).getTime() - ubDayStart(from).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/**
 * URL-ийн query-ээс хугацааг тодорхойлно.
 *
 * · `from` ба `to` хоёул хүчинтэй бол гараар оруулсан завсар (custom)
 * · эс бол `preset` (танигдахгүй бол өнөөдрийг агуулсан хагас сар)
 *
 * Урвуу оруулсан бол (from > to) солино — хоосон тайлан гаргахаас дээр.
 */
export function resolvePeriod(
  params: { preset?: string | null; from?: string | null; to?: string | null },
  now: Date = new Date(),
): ReportPeriod {
  if (isValidDateKey(params.from) && isValidDateKey(params.to)) {
    const [from, to] =
      params.from <= params.to
        ? [params.from, params.to]
        : [params.to, params.from];
    return {
      preset: "custom",
      from,
      to,
      label: formatPeriodLabel(from, to),
      days: daysBetween(from, to),
    };
  }

  const today = ubParts(now);
  const fallback: PeriodPreset = today.day <= 15 ? "this-first" : "this-second";
  const preset = (PERIOD_PRESETS as readonly string[]).includes(
    params.preset ?? "",
  )
    ? (params.preset as PeriodPreset)
    : fallback;

  const { from, to } = rangeOfPreset(preset, now);
  return {
    preset,
    from,
    to,
    label: preset === "all" ? PRESET_LABEL.all : formatPeriodLabel(from, to),
    days: daysBetween(from, to),
  };
}

/**
 * Хугацааг DB query-д хэрэглэх UTC завсар болгоно.
 * `until` нь СҮҮЛИЙН ӨДРИЙН ДАРААХ 00:00 — query-д `< until` гэж хэрэглэнэ.
 */
export function periodToUtcRange(p: { from: string; to: string }): {
  since: Date;
  until: Date;
} {
  return { since: ubDayStart(p.from), until: ubDayStart(ubAddDays(p.to, 1)) };
}

/** Хугацаанд хамрагдах бүх өдрийн key, дарааллаараа */
export function periodDayKeys(p: { from: string; to: string }): string[] {
  const out: string[] = [];
  for (let k = p.from; k <= p.to; k = ubAddDays(k, 1)) out.push(k);
  return out;
}
