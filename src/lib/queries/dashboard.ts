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
  recentOrders: RecentOrder[];
};

/** Supabase-ийн embed нэг мөрийг ч массив хэлбэрээр буцаадаг тохиолдол бий */
function one<T>(v: unknown): T | null {
  if (!v) return null;
  return (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
}

/** Хаягийг нэг мөр болгоно */
function formatAddress(
  a: { district: string | null; khoroo: string | null; detail: string | null } | null,
): string | null {
  if (!a) return null;
  return [a.district, a.khoroo, a.detail].filter(Boolean).join(", ") || null;
}

/** Барааны эхний (sort_order хамгийн бага) зураг */
function firstImage(product: unknown): string | null {
  const p = one<{ images?: { url: string; sort_order: number | null }[] }>(product);
  const imgs = [...(p?.images ?? [])].sort(
    (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0),
  );
  return imgs[0]?.url ?? null;
}

/** Хяналтын самбарт бүтнээр харагдах захиалга — дарж орох шаардлагагүй */
export type RecentOrder = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_phone2: string | null;
  address: string | null;
  items: Array<{
    name: string;
    quantity: number;
    image_url: string | null;
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
    supabase
      .from("orders")
      .select(
        `id, order_number, total, status, created_at, contact_phone, contact_phone2,
         user:profiles(full_name, phone),
         address:addresses(district, khoroo, detail),
         items:order_items(product_name, quantity, product:products(images:product_images(url, sort_order)))`,
      )
      .eq("payment_status", "paid")
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
      customer_name: one<{ full_name: string | null }>(o.user)?.full_name ?? null,
      // Захиалга дээр хадгалсан хүргэлтийн утас тэргүүн эрэмбэтэй —
      // имэйлээр нэвтэрсэн хэрэглэгчид профайлд утас байхгүй
      customer_phone:
        o.contact_phone ?? one<{ phone: string | null }>(o.user)?.phone ?? null,
      customer_phone2: o.contact_phone2 ?? null,
      address: formatAddress(
        one<{ district: string | null; khoroo: string | null; detail: string | null }>(
          o.address,
        ),
      ),
      items: (o.items ?? []).map((it) => ({
        name: it.product_name,
        quantity: it.quantity,
        image_url: firstImage(it.product),
      })),
    })),
  };
}
