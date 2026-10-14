/**
 * Admin dashboard query-үүд (server-side)
 */
import { createClient } from "@/lib/supabase/server";
import { startOfDayMongolia, startOfMonthMongolia } from "@/lib/datetime";
import { getAdminOrders, type AdminOrder } from "@/lib/queries/orders";
import { getStockCounts } from "@/lib/queries/stock-counts";

export type DashboardStats = {
  todayRevenue: number;
  todayOrders: number;
  newCustomersThisMonth: number;
  /** Идэвхтэй, үлдэгдэл 1–20 — бусад цонхтой ижил дүрэм (stockLevel) */
  lowStockCount: number;
  /** Идэвхтэй атлаа дууссан (0) */
  outStockCount: number;
  recentOrders: AdminOrder[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  // UB timezone-аар "өнөөдрийн" эх (UTC server дээр зөв)
  const today = startOfDayMongolia();
  const monthStart = startOfMonthMongolia();

  const [
    { data: todayOrders },
    { count: newCustomersCount },
    stock,
    recentOrders,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", today.toISOString())
      .eq("payment_status", "paid")
      .neq("status", "cancelled"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    getStockCounts(),
    // Захиалгын карт нь /admin/orders-той ижил бүтэцтэй
    getAdminOrders({ limit: 5 }),
  ]);

  const todayRevenue = (todayOrders ?? []).reduce(
    (s, o) => s + Number(o.total ?? 0),
    0,
  );

  return {
    todayRevenue,
    todayOrders: todayOrders?.length ?? 0,
    newCustomersThisMonth: newCustomersCount ?? 0,
    lowStockCount: stock.low,
    outStockCount: stock.out,
    recentOrders,
  };
}
