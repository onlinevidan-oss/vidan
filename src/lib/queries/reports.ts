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
};

const ORDER_SELECT =
  "subtotal, discount, shipping, tax, total, payment_method, created_at, " +
  "items:order_items(product_id, product_name, product_sku, quantity, subtotal, " +
  "product:products(category:categories(name_mn)))";

export async function getReports(period: ReportPeriod): Promise<ReportsData> {
  const supabase = await createClient();
  const { since, until } = periodToUtcRange(period);

  const [{ data: orders }, { count: customers }, { data: products }] =
    await Promise.all([
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
    ]);

  const list = (orders ?? []) as unknown as ReportOrder[];

  return {
    period,
    finance: summarizeFinance(list),
    customers: customers ?? 0,
    byDay: summarizeByDay(list, periodDayKeys(period), ubDateKey),
    soldProducts: summarizeSoldProducts(list),
    byCategory: summarizeByCategory(list),
    byPayment: summarizeByPayment(list),
    inventory: summarizeInventory((products ?? []) as unknown as StockRow[]),
  };
}
