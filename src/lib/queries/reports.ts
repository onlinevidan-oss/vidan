/**
 * Admin reports query-үүд
 */
import { createClient } from "@/lib/supabase/server";
import { ubDateKey } from "@/lib/datetime";

export type DailyRevenue = { date: string; revenue: number; orders: number };

export type ReportsData = {
  totals: {
    revenue: number;
    orders: number;
    avgOrder: number;
    customers: number;
  };
  byDay: DailyRevenue[];
  topProducts: { name: string; sold: number; revenue: number }[];
  byCategory: { name: string; revenue: number; share: number }[];
  byPayment: { method: string; count: number; share: number }[];
};

export async function getReports(days = 30): Promise<ReportsData> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Параллель: orders + customers count
  const [{ data: orders }, { count: customers }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, total, payment_method, created_at, items:order_items(product_id, product_name, quantity, subtotal, product:products(category_id, category:categories(name_mn)))",
      )
      .gte("created_at", since.toISOString())
      .eq("payment_status", "paid")
      .neq("status", "cancelled"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const list = orders ?? [];

  // Totals
  const revenue = list.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const ordersCount = list.length;
  const avgOrder = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // By day (UB timezone-аар key үүсгэх)
  const dayMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap.set(ubDateKey(d), { revenue: 0, orders: 0 });
  }
  list.forEach((o) => {
    const key = ubDateKey(new Date(o.created_at));
    const slot = dayMap.get(key);
    if (slot) {
      slot.revenue += Number(o.total ?? 0);
      slot.orders += 1;
    }
  });
  const byDay: DailyRevenue[] = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    revenue: v.revenue,
    orders: v.orders,
  }));

  // Top products
  const productMap = new Map<string, { name: string; sold: number; revenue: number }>();
  list.forEach((o) => {
    (o.items as { product_id: string | null; product_name: string; quantity: number; subtotal: number }[]).forEach((i) => {
      const key = i.product_id ?? i.product_name;
      const cur = productMap.get(key) ?? { name: i.product_name, sold: 0, revenue: 0 };
      cur.sold += i.quantity;
      cur.revenue += Number(i.subtotal);
      productMap.set(key, cur);
    });
  });
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  // By category
  const catMap = new Map<string, number>();
  list.forEach((o) => {
    (o.items as { subtotal: number; product?: { category?: { name_mn: string } | null } }[]).forEach((i) => {
      const cat = i.product?.category?.name_mn ?? "Бусад";
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(i.subtotal));
    });
  });
  const totalCatRev = Array.from(catMap.values()).reduce((s, v) => s + v, 0) || 1;
  const byCategory = Array.from(catMap.entries())
    .map(([name, rev]) => ({ name, revenue: rev, share: rev / totalCatRev }))
    .sort((a, b) => b.revenue - a.revenue);

  // By payment
  const payMap = new Map<string, number>();
  list.forEach((o) => {
    const m = (o.payment_method ?? "—").toString();
    payMap.set(m, (payMap.get(m) ?? 0) + 1);
  });
  const totalPayCount = list.length || 1;
  const byPayment = Array.from(payMap.entries())
    .map(([method, count]) => ({ method, count, share: count / totalPayCount }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: { revenue, orders: ordersCount, avgOrder, customers: customers ?? 0 },
    byDay,
    topProducts,
    byCategory,
    byPayment,
  };
}
