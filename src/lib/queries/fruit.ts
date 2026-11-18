/**
 * Vidan fruit-ийн админы query-үүд (0048).
 *
 * Жимсний ажилтан санд is_staff()-ээс хасагдсан тул RLS түүнд VIDAN-ы
 * захиалгыг харуулахгүй. Энэ хэсэг service_role-оор уншдаг — тиймээс
 * ЭНД БҮХ QUERY ЖИМСНИЙ БРЭНДЭЭР ШҮҮГДСЭН БАЙХ ЁСТОЙ. Дуудагч хуудас,
 * үйлдэл бүр эхлээд requireFruitAccess()-ээр эрхийг шалгана.
 *
 * Жимсний бараа = brands.slug = 'vidan-fruit'. Жимс орсон захиалгыг
 * (холимог ч гэсэн) эзний шийдвэрээр бүтнээр нь харуулна.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapOrder, ORDER_SELECT, type AdminOrder } from "@/lib/queries/orders";
import type { FruitSaleOrder } from "@/lib/fruit-report";

export const FRUIT_BRAND_SLUG = "vidan-fruit";

type Admin = ReturnType<typeof createAdminClient>;

async function fruitBrandId(admin: Admin): Promise<string | null> {
  const { data } = await admin.from("brands").select("id").eq("slug", FRUIT_BRAND_SLUG).maybeSingle();
  return data?.id ?? null;
}

export type FruitProduct = {
  id: string;
  name_mn: string;
  sku: string;
  price: number;
  stock: number;
  is_active: boolean;
  image_url: string | null;
  /** 0053 — кг-ын нөөц (POOL-*) рүү заана; null бол өөрийн үлдэгдэлтэй */
  stock_source_id: string | null;
  stock_unit_qty: number;
};

/** Жимсний бүх бараа (идэвхгүй ч гэсэн) */
export async function getFruitProducts(): Promise<FruitProduct[]> {
  const admin = createAdminClient();
  const brandId = await fruitBrandId(admin);
  if (!brandId) return [];
  const { data } = await admin
    .from("products")
    .select(
      "id, name_mn, sku, price, stock, is_active, stock_source_id, stock_unit_qty, images:product_images(url, sort_order)",
    )
    .eq("brand_id", brandId)
    .order("sku");
  return (data ?? []).map((p) => ({
    id: p.id,
    name_mn: p.name_mn,
    sku: p.sku,
    price: Number(p.price),
    stock: p.stock,
    is_active: p.is_active,
    stock_source_id: p.stock_source_id,
    stock_unit_qty: p.stock_unit_qty,
    image_url:
      [...(p.images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.url ?? null,
  }));
}

/** Жимсний барааны id-нууд — бусад шүүлтийн үндэс */
export async function getFruitProductIds(admin: Admin = createAdminClient()): Promise<string[]> {
  const brandId = await fruitBrandId(admin);
  if (!brandId) return [];
  const { data } = await admin.from("products").select("id").eq("brand_id", brandId);
  return (data ?? []).map((p) => p.id);
}

/** Жимс орсон захиалгын id */
async function fruitOrderIds(admin: Admin): Promise<string[]> {
  const productIds = await getFruitProductIds(admin);
  if (productIds.length === 0) return [];
  const { data } = await admin.from("order_items").select("order_id").in("product_id", productIds);
  return [...new Set((data ?? []).map((r) => r.order_id))];
}

/** Жимс орсон захиалгууд (шинэ нь эхэнд) */
export async function getFruitOrders(opts?: {
  status?: string;
  paidOnly?: boolean;
  limit?: number;
}): Promise<AdminOrder[]> {
  const admin = createAdminClient();
  const ids = await fruitOrderIds(admin);
  if (ids.length === 0) return [];
  let q = admin.from("orders").select(ORDER_SELECT).in("id", ids).order("created_at", { ascending: false });
  if (opts?.paidOnly ?? true) q = q.eq("payment_status", "paid");
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data ?? []).map(mapOrder);
}

/** Нэг захиалга — ЗӨВХӨН жимс орсон бол, эс бөгөөс null */
export async function getFruitOrder(orderId: string) {
  const admin = createAdminClient();
  const productIds = await getFruitProductIds(admin);
  if (productIds.length === 0) return null;
  const { data: hit } = await admin
    .from("order_items")
    .select("order_id")
    .eq("order_id", orderId)
    .in("product_id", productIds)
    .limit(1);
  if (!hit?.length) return null;

  const { data } = await admin
    .from("orders")
    .select(
      `*, items:order_items(*), address:addresses(*),
       user:profiles(full_name, phone),
       events:order_events(id, event_type, description, created_at, created_by)`,
    )
    .eq("id", orderId)
    .maybeSingle();
  return data;
}

/** Хугацааны жимсний борлуулалт — төлөгдсөн, цуцлагдаагүй */
export async function getFruitSales(range: { since: Date; until: Date }): Promise<{
  orders: FruitSaleOrder[];
  fruitProductIds: Set<string>;
}> {
  const admin = createAdminClient();
  const productIds = await getFruitProductIds(admin);
  if (productIds.length === 0) return { orders: [], fruitProductIds: new Set() };
  const ids = await fruitOrderIds(admin);
  if (ids.length === 0) return { orders: [], fruitProductIds: new Set(productIds) };
  const { data } = await admin
    .from("orders")
    .select("id, user_id, items:order_items(product_id, product_name, product_sku, quantity, unit_price)")
    .in("id", ids)
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .gte("created_at", range.since.toISOString())
    .lt("created_at", range.until.toISOString());
  return {
    orders: (data ?? []) as unknown as FruitSaleOrder[],
    fruitProductIds: new Set(productIds),
  };
}

export type FruitCustomer = {
  user_id: string;
  name: string | null;
  phone: string | null;
  orders: number;
  quantity: number;
  revenue: number;
  last_order_at: string;
};

/** Жимс худалдан авсан хэрэглэгчид — зөвхөн жимсний дүнгээр */
export async function getFruitCustomers(): Promise<FruitCustomer[]> {
  const admin = createAdminClient();
  const productIds = new Set(await getFruitProductIds(admin));
  const ids = await fruitOrderIds(admin);
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("orders")
    .select(
      "id, user_id, created_at, contact_phone, user:profiles(full_name, phone), items:order_items(product_id, quantity, unit_price)",
    )
    .in("id", ids)
    .eq("payment_status", "paid")
    .neq("status", "cancelled");

  const byUser = new Map<string, FruitCustomer>();
  for (const o of data ?? []) {
    if (!o.user_id) continue;
    const u = (Array.isArray(o.user) ? o.user[0] : o.user) as { full_name: string | null; phone: string | null } | null;
    const row = byUser.get(o.user_id) ?? {
      user_id: o.user_id,
      name: u?.full_name ?? null,
      phone: o.contact_phone ?? u?.phone ?? null,
      orders: 0,
      quantity: 0,
      revenue: 0,
      last_order_at: o.created_at,
    };
    row.orders += 1;
    for (const it of o.items ?? []) {
      if (!it.product_id || !productIds.has(it.product_id)) continue;
      row.quantity += it.quantity;
      row.revenue += Number(it.unit_price) * it.quantity;
    }
    if (o.created_at > row.last_order_at) row.last_order_at = o.created_at;
    byUser.set(o.user_id, row);
  }
  return [...byUser.values()].sort((a, b) => b.last_order_at.localeCompare(a.last_order_at));
}

/** Бараа жимсний брэндийнх эсэх — үйлдэл бүрийн өмнө */
export async function isFruitProduct(productId: string): Promise<boolean> {
  const ids = await getFruitProductIds();
  return ids.includes(productId);
}

/** Захиалга жимс агуулсан эсэх — үйлдэл бүрийн өмнө */
export async function isFruitOrder(orderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const productIds = await getFruitProductIds(admin);
  if (productIds.length === 0) return false;
  const { data } = await admin
    .from("order_items")
    .select("order_id")
    .eq("order_id", orderId)
    .in("product_id", productIds)
    .limit(1);
  return !!data?.length;
}

/** Жимсний бараа бүрийн бүх зураг — тохиргооны хуудсанд */
export async function getFruitProductImages(): Promise<
  { id: string; name_mn: string; sku: string; images: { id: string; url: string }[] }[]
> {
  const admin = createAdminClient();
  const brandId = await fruitBrandId(admin);
  if (!brandId) return [];
  const { data } = await admin
    .from("products")
    .select("id, name_mn, sku, images:product_images(id, url, sort_order)")
    .eq("brand_id", brandId)
    .order("sku");
  return (data ?? []).map((p) => ({
    id: p.id,
    name_mn: p.name_mn,
    sku: p.sku,
    images: [...(p.images ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => ({ id: i.id, url: i.url })),
  }));
}
