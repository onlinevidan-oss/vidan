/**
 * Захиалгын жагсаалтын query-үүд (server-side).
 *
 * Хяналтын самбар ба /admin/orders хоёр ижил карт харуулдаг тул мөрийг
 * татах, хөрвүүлэх логикийг энд нэг дор байрлуулав — нэг газраас өөрчилбөл
 * хоёр хуудсанд хоёуланд нь тусна.
 */
import { createClient } from "@/lib/supabase/server";

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

const ORDER_SELECT = `id, order_number, total, status, payment_method, created_at,
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
 * Админд харагдах захиалгууд — зөвхөн төлбөр баталгаажсан нь.
 * Төлөгдөөгүй (pending) захиалга админд гарахгүй.
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

/** Төлөв тус бүрийн тоо (шүүлтүүрийн чипэнд) */
export async function getOrderStatusCounts(): Promise<{
  counts: Record<string, number>;
  total: number;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("status")
    .eq("payment_status", "paid");
  const counts: Record<string, number> = {};
  (data ?? []).forEach((o) => {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  });
  return { counts, total: data?.length ?? 0 };
}
