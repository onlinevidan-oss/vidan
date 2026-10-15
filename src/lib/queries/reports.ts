/**
 * Admin reports query — өгөгдөл татаж, нэгтгэлийг `report-aggregate`-д даана.
 *
 * Тоо нэгтгэх логик энд БИШ — санхүүд өгөгддөг тоо тул цэвэр функц болгож
 * тестлэгдэхээр салгасан (`src/lib/report-aggregate.ts`).
 */
import { createClient } from "@/lib/supabase/server";
import { ubDateKey } from "@/lib/datetime";
import {
  summarizeByCategory,
  summarizeByDay,
  summarizeByPayment,
  summarizeFinance,
  summarizeInventory,
  summarizeSoldProducts,
  type CategoryShare,
  type DailyRevenue,
  type FinanceSummary,
  type InventorySummary,
  type PaymentShare,
  type ReportOrder,
  type SoldProduct,
  type StockRow,
} from "@/lib/report-aggregate";
import {
  periodDayKeys,
  periodToUtcRange,
  type ReportPeriod,
} from "@/lib/report-period";
import {
  summarizePromotions,
  type CampaignLogRow,
  type PromoReport,
  type PromoReportOrder,
  type PromotionRow,
  type RedemptionRow,
} from "@/lib/promo-report";

export type { DailyRevenue };

export type ReportsData = {
  period: ReportPeriod;
  finance: FinanceSummary;
  customers: number;
  byDay: DailyRevenue[];
  soldProducts: SoldProduct[];
  byCategory: CategoryShare[];
  byPayment: PaymentShare[];
  inventory: InventorySummary;
  /** Агуулах — орлого, зарлага, үлдэгдэл */
  /** Ажилтны дотоод/туршилтын захиалгын задаргаа (нийт дүнд ОРСОН) */
  internal: FinanceSummary;
  /** Урамшуулал — кампанит ажил, промо код, хөнгөлөлт эдэлсэн бараа */
  promotions: PromoReport;
};

const ORDER_SELECT =
  "id, user_id, subtotal, discount, shipping, tax, total, payment_method, created_at, " +
  "items:order_items(product_id, product_name, product_sku, quantity, subtotal, " +
  "unit_price, list_price, sale_campaign, " +
  "product:products(category:categories(name_mn)))";

export async function getReports(period: ReportPeriod): Promise<ReportsData> {
  const supabase = await createClient();
  const { since, until } = periodToUtcRange(period);

  const [
    { data: orders },
    { count: customers },
    { data: products },
    { data: staff },
    { data: promotions },
    { data: campaignLog },
  ] = await Promise.all([
      supabase
        .from("orders")
        .select(ORDER_SELECT)
        .gte("created_at", since.toISOString())
        .lt("created_at", until.toISOString())
        .eq("payment_status", "paid")
        .neq("status", "cancelled"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      // Агуулахын үлдэгдэл нь ОДООГИЙН зураг — хугацаанаас хамаарахгүй
      supabase
        .from("products")
        .select("name_mn, sku, stock, price, category:categories(name_mn)")
        .eq("is_active", true),
      // Ажилтны захиалгыг хэрэглэгчийнхээс салгахад
      supabase.from("staff").select("id"),
      supabase
        .from("promotions")
        .select("id, code, name, type, value, starts_at, ends_at, is_active"),
      supabase
        .from("sale_campaign_log")
        .select("code, name, brand_slug, percent, starts_at, ends_at, enabled, recorded_at"),
    ]);

  // Промо кодын хэрэглээ — зөвхөн энэ хугацааны захиалгуудынх
  const orderIds = ((orders ?? []) as unknown as { id: string }[]).map((o) => o.id);
  const { data: redemptions } = orderIds.length
    ? await supabase
        .from("promo_redemptions")
        .select("promo_id, order_id, discount")
        .in("order_id", orderIds)
    : { data: [] };

  const staffIds = new Set((staff ?? []).map((s) => s.id));
  const raw = (orders ?? []) as unknown as (ReportOrder & { user_id: string | null })[];
  const list: ReportOrder[] = raw.map((o) => ({
    ...o,
    is_internal: !!o.user_id && staffIds.has(o.user_id),
  }));
  // Санхүүгийн тоонд БҮХ захиалга орно; ажилтных нь тусдаа мөрөөр харагдана
  const internalOrders = list.filter((o) => o.is_internal);

  return {
    period,
    finance: summarizeFinance(list),
    internal: summarizeFinance(internalOrders),
    customers: customers ?? 0,
    byDay: summarizeByDay(list, periodDayKeys(period), ubDateKey),
    soldProducts: summarizeSoldProducts(list),
    byCategory: summarizeByCategory(list),
    byPayment: summarizeByPayment(list),
    inventory: summarizeInventory((products ?? []) as unknown as StockRow[]),
    promotions: summarizePromotions({
      orders: (orders ?? []) as unknown as PromoReportOrder[],
      campaignLog: (campaignLog ?? []) as CampaignLogRow[],
      promotions: (promotions ?? []) as PromotionRow[],
      redemptions: (redemptions ?? []) as RedemptionRow[],
      period: { start: since.getTime(), end: until.getTime() },
    }),
  };
}
