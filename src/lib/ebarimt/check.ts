/**
 * И-баримтын шалгалт — баримтын бодит дүнг захиалгын төлсөн дүнтэй тулгах.
 * Цэвэр функцууд (тестлэгдэнэ): QPay-ийн хариуг задлах, төлөв тодорхойлох,
 * нэгтгэх. /admin/ebarimt болон баримт үүсгэх урсгал хоёулаа хэрэглэнэ.
 */

/** QPay-ээр анхны и-баримт үүссэн өдөр (УБ) — #10305. Жагсаалтын өгөгдмөл эхлэл. */
export const EBARIMT_START_DATE = "2026-09-14";

export type ReceiptAmounts = {
  amount: number | null;
  vat: number | null;
  cityTax: number | null;
  status: string | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * QPay-ийн и-баримтын хариуг задлана. Дүнгүүд мөр хэлбэрээр ирдэг
 * ("93400.00"). Төлөвийн талбар create-д `ebarimt_status`, GET-д
 * `barimt_status` нэртэй ирдэг (2026-10-15-нд жинхэнэ API-аар шалгасан).
 */
export function parseReceiptAmounts(
  raw: Record<string, unknown> | null | undefined,
): ReceiptAmounts {
  if (!raw) return { amount: null, vat: null, cityTax: null, status: null };
  const status = raw.barimt_status ?? raw.ebarimt_status ?? null;
  return {
    amount: num(raw.amount),
    vat: num(raw.vat_amount),
    cityTax: num(raw.city_tax_amount),
    status: typeof status === "string" && status ? status : null,
  };
}

/**
 *  · ok        — баримт байгаа, дүн нь захиалгын төлсөн дүнтэй таарсан
 *  · mismatch  — баримтын дүн зөрүүтэй
 *  · unchecked — баримт байгаа ч дүнг нь QPay-ээс хараахан аваагүй
 *  · missing   — төлөгдсөн атлаа баримт үүсээгүй
 */
export type EbarimtCheck = "ok" | "mismatch" | "unchecked" | "missing";

export const EBARIMT_CHECK_LABEL: Record<EbarimtCheck, string> = {
  ok: "✓ Таарсан",
  mismatch: "⚠ Зөрүүтэй",
  unchecked: "Шалгаагүй",
  missing: "Баримтгүй",
};

export function ebarimtCheck(o: {
  total: number;
  ebarimt_id: string | null;
  ebarimt_amount: number | null;
}): EbarimtCheck {
  if (!o.ebarimt_id) return "missing";
  if (o.ebarimt_amount === null || o.ebarimt_amount === undefined) return "unchecked";
  // Төгрөг бүхэл — 50 мөнгөнөөс бага зөрүүг бүхэлчлэлийн гэж үзнэ
  return Math.abs(Number(o.ebarimt_amount) - Number(o.total)) < 0.5 ? "ok" : "mismatch";
}

export type EbarimtSummary = {
  orders: number;
  withReceipt: number;
  ok: number;
  mismatch: number;
  unchecked: number;
  missing: number;
  /** Шалгагдсан баримтуудын нийт дүн */
  receiptTotal: number;
  /** Шалгагдсан баримтуудын нийт НӨАТ */
  vatTotal: number;
};

export function summarizeEbarimt(
  rows: { total: number; ebarimt_id: string | null; ebarimt_amount: number | null; ebarimt_vat: number | null }[],
): EbarimtSummary {
  const s: EbarimtSummary = {
    orders: rows.length,
    withReceipt: 0,
    ok: 0,
    mismatch: 0,
    unchecked: 0,
    missing: 0,
    receiptTotal: 0,
    vatTotal: 0,
  };
  for (const r of rows) {
    const c = ebarimtCheck(r);
    s[c]++;
    if (r.ebarimt_id) s.withReceipt++;
    if (r.ebarimt_amount !== null) s.receiptTotal += Number(r.ebarimt_amount);
    if (r.ebarimt_vat !== null) s.vatTotal += Number(r.ebarimt_vat);
  }
  s.vatTotal = Math.round(s.vatTotal * 100) / 100;
  return s;
}
