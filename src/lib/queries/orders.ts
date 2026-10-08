/**
 * Захиалгын жагсаалтын query-үүд (server-side).
 *
 * Хяналтын самбар ба /admin/orders хоёр ижил карт харуулдаг тул мөрийг
 * татах, хөрвүүлэх логикийг энд нэг дор байрлуулав — нэг газраас өөрчилбөл
 * хоёр хуудсанд хоёуланд нь тусна.
 */
import { createClient } from "@/lib/supabase/server";
import { ubAddDays, ubDayStart } from "@/lib/datetime";
import {
  ORDERS_PAGE_SIZE,
  safeSearchTerm,
  searchDigits,
  type OrderListParams,
} from "@/lib/order-list";

export type AdminOrderItem = {
  name: string;
  quantity: number;
  image_url: string | null;
};

export type AdminOrder = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_phone2: string | null;
  address_label: string | null;
  address: string | null;
  items: AdminOrderItem[];
};

/** Supabase-ийн embed нэг мөрийг ч массив хэлбэрээр буцаадаг тохиолдол бий */
function one<T>(v: unknown): T | null {
  if (!v) return null;
  return (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
}

type AddressRow = {
  label: string | null;
  district: string | null;
  khoroo: string | null;
  detail: string | null;
};

/** Хаягийг нэг мөр болгоно */
function formatAddress(a: AddressRow | null): string | null {
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

const ORDER_SELECT = `id, order_number, total, status, payment_status, payment_method, created_at,
   contact_phone, contact_phone2,
   user:profiles(full_name, phone),
   address:addresses(label, district, khoroo, detail),
   items:order_items(product_name, quantity, product:products(images:product_images(url, sort_order)))`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapOrder(o: any): AdminOrder {
  const addr = one<AddressRow>(o.address);
  return {
    id: o.id,
    order_number: o.order_number,
    total: Number(o.total ?? 0),
    status: o.status,
    payment_status: o.payment_status,
    payment_method: o.payment_method ?? null,
    created_at: o.created_at,
    customer_name: one<{ full_name: string | null }>(o.user)?.full_name ?? null,
    // Захиалга дээр хадгалсан хүргэлтийн утас тэргүүн эрэмбэтэй —
    // имэйлээр нэвтэрсэн хэрэглэгчид профайлд утас байхгүй
    customer_phone:
      o.contact_phone ?? one<{ phone: string | null }>(o.user)?.phone ?? null,
    customer_phone2: o.contact_phone2 ?? null,
    address_label: addr?.label ?? null,
    address: formatAddress(addr),
    items: (o.items ?? []).map((it: any) => ({
      name: it.product_name,
      quantity: it.quantity,
      image_url: firstImage(it.product),
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Сүүлийн төлөгдсөн захиалгууд — хяналтын самбарт.
 * Төлөгдөөгүй (pending) захиалга энд гарахгүй.
 */
export async function getAdminOrders(opts?: {
  status?: string;
  limit?: number;
}): Promise<AdminOrder[]> {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 50);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data } = await q;
  return (data ?? []).map(mapOrder);
}

export type AdminOrdersPage = {
  orders: AdminOrder[];
  /** Шүүлтүүрт таарсан нийт тоо (бүх хуудас) */
  total: number;
  page: number;
  pages: number;
};

/** Хоосон үр дүн гаргах шүүлтүүр — байхгүй id */
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

/**
 * /admin/orders-ийн жагсаалт — шүүлтүүр, хайлт, хуудаслалттай.
 *
 *  · view=paid   — төлөгдсөн захиалга (бэлтгэх, хүргэх ажил)
 *  · view=unpaid — төлбөр хүлээгдэж буй болон төлөөгүй цуцлагдсан
 *                  (залгаж сануулах жагсаалт)
 *
 * Хайлт: захиалгын дугаар, захиалга дээрх утас, хэрэглэгчийн нэр/утас.
 */
export async function getAdminOrdersPage(
  f: OrderListParams,
): Promise<AdminOrdersPage> {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  q =
    f.view === "unpaid"
      ? q.in("payment_status", ["pending", "failed"])
      : q.eq("payment_status", "paid");
  if (f.status) q = q.eq("status", f.status);

  // Огнооны зааг УБ өдрөөр — сервер UTC тул шууд огноо харьцуулахгүй
  if (f.from) q = q.gte("created_at", ubDayStart(f.from).toISOString());
  if (f.to) q = q.lt("created_at", ubDayStart(ubAddDays(f.to, 1)).toISOString());

  if (f.search) {
    const digits = searchDigits(f.search);
    const text = safeSearchTerm(f.search);
    const ors: string[] = [];

    if (digits) {
      ors.push(
        `order_number.ilike.%${digits}%`,
        `contact_phone.ilike.%${digits}%`,
        `contact_phone2.ilike.%${digits}%`,
      );
    }

    // Нэр эсвэл профайлын утсаар хэрэглэгчийг олж, тэдний захиалгыг нэмнэ
    const peopleFilters: string[] = [];
    if (text && text !== digits) peopleFilters.push(`full_name.ilike.%${text}%`);
    if (digits.length >= 4) peopleFilters.push(`phone.ilike.%${digits}%`);
    if (peopleFilters.length > 0) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id")
        .or(peopleFilters.join(","))
        .limit(100);
      const ids = (people ?? []).map((p) => p.id);
      if (ids.length > 0) ors.push(`user_id.in.(${ids.join(",")})`);
    }

    q = ors.length > 0 ? q.or(ors.join(",")) : q.eq("id", NO_MATCH_ID);
  }

  const offset = (f.page - 1) * ORDERS_PAGE_SIZE;
  const { data, count } = await q.range(offset, offset + ORDERS_PAGE_SIZE - 1);

  const total = count ?? 0;
  return {
    orders: (data ?? []).map(mapOrder),
    total,
    page: f.page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

/**
 * Төлөв тус бүрийн тоо (шүүлтүүрийн чипэнд).
 * `unpaid` — одоо төлбөр хүлээгдэж буй (хараахан цуцлагдаагүй) захиалга.
 */
export async function getOrderStatusCounts(): Promise<{
  counts: Record<string, number>;
  total: number;
  unpaid: number;
}> {
  const supabase = await createClient();
  const [{ data }, { count: unpaid }] = await Promise.all([
    supabase.from("orders").select("status").eq("payment_status", "paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending")
      .neq("status", "cancelled"),
  ]);
  const counts: Record<string, number> = {};
  (data ?? []).forEach((o) => {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  });
  return { counts, total: data?.length ?? 0, unpaid: unpaid ?? 0 };
}

/** Нэг хэрэглэгчийн бүх захиалга — төлөгдсөн, төлөгдөөгүй аль аль нь */
export async function getCustomerOrders(userId: string): Promise<AdminOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(mapOrder);
}
