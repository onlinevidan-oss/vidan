/**
 * Admin dashboard query-үүд (server-side)
 */
import { createClient } from "@/lib/supabase/server";
import { startOfDayMongolia, startOfMonthMongolia } from "@/lib/datetime";
import { getAdminOrders, type AdminOrder } from "@/lib/queries/orders";

export type DashboardStats = {
  todayRevenue: number;
  todayOrders: number;
  newCustomersThisMonth: number;
  lowStockCount: number;
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
    { count: lowStockCount },
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
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("stock", 20),
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
    lowStockCount: lowStockCount ?? 0,
    recentOrders,
  };
}
