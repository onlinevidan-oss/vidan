/**
 * Захиалгын жагсаалтын шүүлтүүр — URL-ийн параметрийг задлах, холбоос үүсгэх.
 * Цэвэр функцууд: хуудас, шүүлтүүрийн чип, хуудаслалт гурвуулаа нэг дүрмээр
 * ажиллахын тулд нэг газар байна.
 */
import { ORDER_STATUSES, type OrderStatus } from "./order-status.ts";

/** Нэг хуудсанд харуулах захиалгын тоо */
export const ORDERS_PAGE_SIZE = 30;

export type OrderListParams = {
  /** paid — төлөгдсөн (өгөгдмөл); unpaid — төлбөр хүлээгдэж буй ба төлөөгүй цуцлагдсан */
  view: "paid" | "unpaid";
  status?: OrderStatus;
  search?: string;
  /** УБ өдөр "YYYY-MM-DD" */
  from?: string;
  to?: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function dateKey(v: string | undefined): string | undefined {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  // 2026-02-31 мэт байхгүй өдрийг хүлээж авахгүй
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
    ? v
    : undefined;
}

export function parseOrderListParams(raw: RawParams): OrderListParams {
  const view = first(raw.view) === "unpaid" ? "unpaid" : "paid";

  const s = first(raw.status);
  const status =
    view === "paid" && (ORDER_STATUSES as readonly string[]).includes(s ?? "")
      ? (s as OrderStatus)
      : undefined;

  const search = first(raw.q)?.trim().slice(0, 60) || undefined;

  let from = dateKey(first(raw.from));
  let to = dateKey(first(raw.to));
  // Эхлэл төгсгөлөөс хойш бол солино — хоосон жагсаалт гаргаж төөрөгдүүлэхгүй
  if (from && to && from > to) [from, to] = [to, from];

  const p = Math.trunc(Number(first(raw.page)));
  const page = Number.isFinite(p) && p >= 1 ? p : 1;

  return { view, status, search, from, to, page };
}

/**
 * Одоогийн шүүлтүүр дээр өөрчлөлт хийсэн холбоос.
 * Шүүлтүүр солигдоход хуудас 1 рүү буцна (зөвхөн `page`-ийг өөрөө өгвөл хадгална).
 */
export function orderListHref(
  current: OrderListParams,
  patch: Partial<OrderListParams> = {},
): string {
  const next = { ...current, ...patch };
  if (!("page" in patch)) next.page = 1;
  if (next.view === "unpaid") next.status = undefined;

  const qs = new URLSearchParams();
  if (next.view === "unpaid") qs.set("view", "unpaid");
  if (next.status) qs.set("status", next.status);
  if (next.search) qs.set("q", next.search);
  if (next.from) qs.set("from", next.from);
  if (next.to) qs.set("to", next.to);
  if (next.page > 1) qs.set("page", String(next.page));

  const s = qs.toString();
  return s ? `/admin/orders?${s}` : "/admin/orders";
}

/** Хайлтын үгээс тоон хэсгийг ялгана — захиалгын дугаар, утсаар хайхад */
export function searchDigits(term: string): string {
  return term.replace(/\D/g, "");
}

/** PostgREST-ийн `or()` шүүлтүүрийг эвдэх тэмдэгтүүдийг арилгана */
export function safeSearchTerm(term: string): string {
  return term.replace(/[%_,()*\\"']/g, " ").replace(/\s+/g, " ").trim();
}
