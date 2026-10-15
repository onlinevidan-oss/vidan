/**
 * Урамшууллын тайлан — цэвэр функц (DB-д хүрэхгүй).
 *
 * Хоёр төрлийн урамшуулал:
 *   · КАМПАНИТ АЖИЛ (жнь. VIDAN 10%) — барааны үнийг өөрийг нь бууруулдаг.
 *     Мөр бүрийн хямдралын өмнөх үнэ order_items.list_price-д, код нь
 *     sale_campaign-д хадгалагдана (0044). Хэзээ зарлагдсаныг
 *     sale_campaign_log-оос гаргана.
 *   · ПРОМО КОД (NEW10, VIP5K …) — захиалгын түвшний хөнгөлөлт
 *     (promo_redemptions). Бараа тус бүрт мөрийн дүнгийн харьцаагаар
 *     хуваарилна — нийлбэр нь захиалгын хөнгөлөлттэй яг тэнцэнэ.
 *
 * Гараар хямдруулсан үнэ (зураастай үнэ, кампанит ажилгүй) тусдаа мөр.
 */
import { allocateByLargestRemainder } from "./qpay/ebarimt-lines.ts";

export type PromoReportItem = {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  /** Хямдралын өмнөх нэгжийн үнэ (null бол unit_price) */
  list_price: number | null;
  sale_campaign: string | null;
};

export type PromoReportOrder = {
  id: string;
  created_at: string;
  discount: number;
  items: PromoReportItem[];
};

export type CampaignLogRow = {
  code: string;
  name: string | null;
  brand_slug: string | null;
  percent: number | null;
  starts_at: string | null;
  ends_at: string | null;
  enabled: boolean;
  recorded_at: string;
};

export type PromotionRow = {
  id: string;
  code: string;
  name: string | null;
  type: string;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type RedemptionRow = { promo_id: string; order_id: string; discount: number };

export type PromoProductRow = {
  name: string;
  sku: string | null;
  quantity: number;
  /** Хямдралын өмнөх дүн */
  listAmount: number;
  discount: number;
  /** Борлуулсан дүн = listAmount − discount */
  soldAmount: number;
};

export type PromoEntry = {
  key: string;
  kind: "campaign" | "promo" | "manual";
  name: string;
  /** Жнь. "10% · vidan", "NEW10 · 10%" */
  detail: string;
  /** Зарлагдсан хугацаа (ISO, төгсгөл нь оролцохгүй) — гараар хямдралд null */
  startsAt: string | null;
  endsAt: string | null;
  orders: number;
  quantity: number;
  listAmount: number;
  discount: number;
  soldAmount: number;
  products: PromoProductRow[];
};

export type PromoReport = {
  entries: PromoEntry[];
  /** Бүх урамшууллын нийт хөнгөлөлт */
  totalDiscount: number;
};

/**
 * Санхүүгийн задаргаанд оруулах хураангуй.
 *
 * Хямдрал (кампанит ажил, гар хямдрал) барааны үнийг өөрийг нь бууруулдаг
 * тул захиалгын барааны дүнд аль хэдийн хасагдсан байдаг — задаргаанд
 * "хямдралын өмнөх борлуулалт − хямдрал" гэж ил гаргана, цэвэр орлого
 * өөрчлөгдөхгүй. Промо код нь orders.discount-оор тусад нь хасагддаг.
 */
export function financePromoSummary(report: PromoReport): {
  /** Үнийн хямдралын нийлбэр — барааны дүнд аль хэдийн хасагдсан */
  priceDiscount: number;
  priceRows: PromoEntry[];
  promoRows: PromoEntry[];
} {
  const used = report.entries.filter((e) => e.discount > 0);
  const priceRows = used.filter((e) => e.kind !== "promo");
  return {
    priceDiscount: priceRows.reduce((s, e) => s + e.discount, 0),
    priceRows,
    promoRows: used.filter((e) => e.kind === "promo"),
  };
}

/** Ижил кампанит ажлын хоёр хувилбарыг нэг гэж үзэх завсар (сунгалт гэх мэт) */
const MERGE_GAP_MS = 24 * 60 * 60 * 1000;

type Window = { start: number; end: number };

type CampaignSpan = {
  code: string;
  name: string;
  brand: string | null;
  percent: number | null;
  start: number;
  end: number;
};

/**
 * Кампанит ажлын БОДИТ ажилласан хугацаанууд.
 *
 * Хувилбар бүр бүртгэгдсэн цагаасаа (recorded_at) өмнө ажиллах боломжгүй,
 * дараагийн хувилбар бүртгэгдмэгц дуусна. Ижил код/нэр/хувь/брэндтэй,
 * 24 цагаас бага завсартай хувилбаруудыг нэгтгэнэ — админ хугацааг
 * сунгахад нэг кампанит ажил хоёр болж харагдахгүй.
 */
export function campaignSpans(log: CampaignLogRow[]): CampaignSpan[] {
  const rows = [...log].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const spans: CampaignSpan[] = [];
  rows.forEach((r, i) => {
    if (!r.enabled || !r.starts_at || !r.ends_at) return;
    const next = rows[i + 1];
    const start = Math.max(Date.parse(r.starts_at), Date.parse(r.recorded_at));
    const end = Math.min(
      Date.parse(r.ends_at),
      next ? Date.parse(next.recorded_at) : Number.POSITIVE_INFINITY,
    );
    if (!(end > start)) return;
    const span: CampaignSpan = {
      code: r.code,
      name: r.name ?? r.code,
      brand: r.brand_slug,
      percent: r.percent == null ? null : Number(r.percent),
      start,
      end,
    };
    const prev = spans[spans.length - 1];
    if (
      prev &&
      prev.code === span.code &&
      prev.name === span.name &&
      prev.brand === span.brand &&
      prev.percent === span.percent &&
      span.start - prev.end <= MERGE_GAP_MS
    ) {
      prev.end = Math.max(prev.end, span.end);
    } else {
      spans.push(span);
    }
  });
  return spans;
}

const overlaps = (a: Window, b: Window) => a.start < b.end && b.start < a.end;

type Acc = {
  orders: Set<string>;
  products: Map<string, PromoProductRow>;
};

const newAcc = (): Acc => ({ orders: new Set(), products: new Map() });

function addLine(
  acc: Acc,
  orderId: string,
  item: PromoReportItem,
  listAmount: number,
  discount: number,
) {
  acc.orders.add(orderId);
  const key = item.product_id ?? item.product_sku ?? item.product_name;
  const row = acc.products.get(key) ?? {
    name: item.product_name,
    sku: item.product_sku,
    quantity: 0,
    listAmount: 0,
    discount: 0,
    soldAmount: 0,
  };
  row.quantity += item.quantity;
  row.listAmount += listAmount;
  row.discount += discount;
  row.soldAmount += listAmount - discount;
  acc.products.set(key, row);
}

function finish(
  base: Omit<PromoEntry, "orders" | "quantity" | "listAmount" | "discount" | "soldAmount" | "products">,
  acc: Acc,
): PromoEntry {
  const products = [...acc.products.values()].sort(
    (a, b) => b.discount - a.discount || a.name.localeCompare(b.name),
  );
  const sum = (f: (p: PromoProductRow) => number) => products.reduce((s, p) => s + f(p), 0);
  return {
    ...base,
    orders: acc.orders.size,
    quantity: sum((p) => p.quantity),
    listAmount: sum((p) => p.listAmount),
    discount: sum((p) => p.discount),
    soldAmount: sum((p) => p.soldAmount),
    products,
  };
}

function promoDetail(p: PromotionRow): string {
  if (p.type === "percent") return `${p.code} · ${p.value}%`;
  if (p.type === "fixed") return `${p.code} · ${Number(p.value).toLocaleString("en-US")}₮`;
  return p.code;
}

/**
 * @param orders  тайлангийн хугацааны төлөгдсөн, цуцлагдаагүй захиалгууд
 * @param period  тайлангийн хугацаа (ms, төгсгөл оролцохгүй)
 */
export function summarizePromotions(input: {
  orders: PromoReportOrder[];
  campaignLog: CampaignLogRow[];
  promotions: PromotionRow[];
  redemptions: RedemptionRow[];
  period: Window;
}): PromoReport {
  const { orders, campaignLog, promotions, redemptions, period } = input;
  const spans = campaignSpans(campaignLog);

  // ---------- Кампанит ажил ----------
  const spanAcc = spans.map(() => newAcc());
  const manual = newAcc();
  for (const o of orders) {
    const t = Date.parse(o.created_at);
    for (const it of o.items) {
      const list = Number(it.list_price ?? it.unit_price);
      const unit = Number(it.unit_price);
      if (!(list > unit)) continue;
      const listAmount = list * it.quantity;
      const discount = (list - unit) * it.quantity;
      if (!it.sale_campaign) {
        addLine(manual, o.id, it, listAmount, discount);
        continue;
      }
      // Ижил кодтой, захиалгын цагийг хамарсан хугацаа; олдохгүй бол
      // тэр кодын захиалгаас өмнө эхэлсэн хамгийн сүүлийнх
      let idx = spans.findIndex((s) => s.code === it.sale_campaign && t >= s.start && t < s.end);
      if (idx < 0) {
        for (let k = spans.length - 1; k >= 0; k--) {
          if (spans[k].code === it.sale_campaign && spans[k].start <= t) {
            idx = k;
            break;
          }
        }
      }
      if (idx < 0) addLine(manual, o.id, it, listAmount, discount);
      else addLine(spanAcc[idx], o.id, it, listAmount, discount);
    }
  }

  const entries: PromoEntry[] = [];
  spans.forEach((s, i) => {
    const acc = spanAcc[i];
    if (acc.orders.size === 0 && !overlaps(s, period)) return;
    entries.push(
      finish(
        {
          key: `campaign:${s.code}:${s.start}`,
          kind: "campaign",
          name: s.name,
          detail: [s.percent != null ? `${s.percent}%` : null, s.brand].filter(Boolean).join(" · "),
          startsAt: new Date(s.start).toISOString(),
          endsAt: Number.isFinite(s.end) ? new Date(s.end).toISOString() : null,
        },
        acc,
      ),
    );
  });

  // ---------- Промо код ----------
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const byPromo = new Map<string, RedemptionRow[]>();
  for (const r of redemptions) {
    if (!orderById.has(r.order_id)) continue;
    byPromo.set(r.promo_id, [...(byPromo.get(r.promo_id) ?? []), r]);
  }
  for (const p of promotions) {
    const used = byPromo.get(p.id) ?? [];
    const win: Window = {
      start: p.starts_at ? Date.parse(p.starts_at) : Number.NEGATIVE_INFINITY,
      end: p.ends_at ? Date.parse(p.ends_at) : Number.POSITIVE_INFINITY,
    };
    if (used.length === 0 && !(p.is_active && overlaps(win, period))) continue;
    const acc = newAcc();
    for (const r of used) {
      const o = orderById.get(r.order_id)!;
      const amounts = o.items.map((it) => Number(it.unit_price) * it.quantity);
      const shares = allocateByLargestRemainder(amounts, Number(r.discount));
      o.items.forEach((it, k) => addLine(acc, o.id, it, amounts[k], shares[k]));
      if (o.items.length === 0) acc.orders.add(o.id);
    }
    entries.push(
      finish(
        {
          key: `promo:${p.id}`,
          kind: "promo",
          name: p.name ?? p.code,
          detail: promoDetail(p),
          startsAt: p.starts_at,
          endsAt: p.ends_at,
        },
        acc,
      ),
    );
  }

  if (manual.orders.size > 0) {
    entries.push(
      finish(
        {
          key: "manual",
          kind: "manual",
          name: "Гараар хямдруулсан үнэ",
          detail: "зураастай үнэ",
          startsAt: null,
          endsAt: null,
        },
        manual,
      ),
    );
  }

  return {
    entries,
    totalDiscount: entries.reduce((s, e) => s + e.discount, 0),
  };
}
