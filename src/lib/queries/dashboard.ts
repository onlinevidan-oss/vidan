/**
 * Admin dashboard query-үүд (server-side)
 */
import { createClient } from "@/lib/supabase/server";
import { startOfDayMongolia, startOfMonthMongolia } from "@/lib/datetime";

export type DashboardStats = {
  todayRevenue: number;
  todayOrders: number;
  newCustomersThisMonth: number;
  lowStockCount: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
    customer_name: string | null;
    customer_phone: string | null;
  }>;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  // UB timezone-аар "өнөөдрийн" эх (UTC server дээр зөв)
  const today = startOfDayMongolia();
  const monthStart = startOfMonthMongolia();

  // 4 query параллель + recent orders
  const [
    { data: todayOrders },
    { count: newCustomersCount },
    { count: lowStockCount },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .gte("created_at", today.toISOString())
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
    supabase
      .from("orders")
      .select(
        "id, order_number, total, status, created_at, user:profiles(full_name, phone)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
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
    recentOrders: (recent ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total: Number(o.total ?? 0),
      status: o.status,
      created_at: o.created_at,
      customer_name:
        (o.user as { full_name: string | null } | null)?.full_name ?? null,
      customer_phone:
        (o.user as { phone: string | null } | null)?.phone ?? null,
    })),
  };
}
