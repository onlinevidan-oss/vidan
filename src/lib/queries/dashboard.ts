/**
 * Admin dashboard query-үүд (server-side)
 */
import { createClient } from "@/lib/supabase/server";

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
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 4 KPI query-ийг параллель ажиллуулна
  const [
    { data: todayOrders },
    { count: newCustomersCount },
    { data: lowStockProducts },
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
      .select("id")
      .eq("is_active", true)
      .lte("stock", 20), // stock_threshold-ыг ашиглах боломжтой, гэхдээ raw filter түр хэрэглэе
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
    lowStockCount: lowStockProducts?.length ?? 0,
    recentOrders: (recent ?? []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total: Number(o.total ?? 0),
      status: o.status,
      created_at: o.created_at,
      customer_name: (o.user as { full_name: string | null } | null)
        ?.full_name ?? null,
      customer_phone: (o.user as { phone: string | null } | null)?.phone ?? null,
    })),
  };
}
