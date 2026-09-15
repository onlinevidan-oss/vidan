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
  summarizeStockFlow,
  type CategoryShare,
  type DailyRevenue,
  type FinanceSummary,
  type InventorySummary,
  type PaymentShare,
  type ReportOrder,
  type SoldProduct,
  type StockFlowSummary,
  type StockMovementRow,
  type StockRow,
} from "@/lib/report-aggregate";
import {
  periodDayKeys,
  periodToUtcRange,
  type ReportPeriod,
} from "@/lib/report-period";

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
  /** Агуулахын тэнцэл — орлогоос үлдэгдэл хүртэл */
  stockFlow: StockFlowSummary;
  /** Ажилтны дотоод/туршилтын захиалгын хэсэг */
  internal: FinanceSummary;
};

const ORDER_SELECT =
  "user_id, subtotal, discount, shipping, tax, total, payment_method, created_at, " +
  "items:order_items(product_id, product_name, product_sku, quantity, subtotal, " +
  "product:products(category:categories(name_mn)))";

export async function getReports(period: ReportPeriod): Promise<ReportsData> {
  const supabase = await createClient();
  const { since, until } = periodToUtcRange(period);

  const [
    { data: orders },
    { count: customers },
    { data: products },
    { data: staff },
    { data: movements },
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
        .select("name_mn, sku, stock, price, stock_threshold, category:categories(name_mn)")
        .eq("is_active", true),
      // Ажилтны захиалгыг хэрэглэгчийнхээс салгахад
      supabase.from("staff").select("id"),
      // Агуулахын тэнцэл нь ОДООГИЙН байдал — хугацаанаас хамаарахгүй
      supabase.from("stock_movements").select("kind, quantity, order_id"),
    ]);

  const staffIds = new Set((staff ?? []).map((s) => s.id));
  const raw = (orders ?? []) as unknown as (ReportOrder & { user_id: string | null })[];
  const list: ReportOrder[] = raw.map((o) => ({
    ...o,
    is_internal: !!o.user_id && staffIds.has(o.user_id),
  }));
  // Санхүүгийн үндсэн тоо нь ЗӨВХӨН хэрэглэгчийн захиалга
  const customerOrders = list.filter((o) => !o.is_internal);
  const internalOrders = list.filter((o) => o.is_internal);
  const stockTotal = (products ?? []).reduce((s, p) => s + Number(p.stock ?? 0), 0);

  return {
    period,
    finance: summarizeFinance(customerOrders),
    internal: summarizeFinance(internalOrders),
    stockFlow: summarizeStockFlow(
      (movements ?? []) as unknown as StockMovementRow[],
      stockTotal,
    ),
    customers: customers ?? 0,
    byDay: summarizeByDay(customerOrders, periodDayKeys(period), ubDateKey),
    soldProducts: summarizeSoldProducts(customerOrders),
    byCategory: summarizeByCategory(customerOrders),
    byPayment: summarizeByPayment(customerOrders),
    inventory: summarizeInventory((products ?? []) as unknown as StockRow[]),
  };
}
