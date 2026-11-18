/**
 * "Жимс" хуудасны өгөгдөл — хуудасны бүтцийг (fruit-preview.ts) сангийн
 * жинхэнэ бараа (үнэ, үлдэгдэл, id) — тай нийлүүлнэ (0053).
 * Нэвтрээгүй хүн ч уншина — зөвхөн идэвхтэй бараа (RLS + шүүлт).
 */
import { createPublicClient } from "@/lib/supabase/public";
import { FRUIT_SKUS, FRUIT_VARIETIES, type FruitProduct } from "@/lib/fruit-preview";

export async function getFruitCatalog(): Promise<FruitProduct[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, slug, name_mn, price, stock")
    .in("sku", FRUIT_SKUS)
    .eq("is_active", true);
  if (error) throw error;

  const bySku = new Map((data ?? []).map((p) => [p.sku, p]));
  return FRUIT_VARIETIES.map((v) => ({
    ...v,
    options: v.options.flatMap((o) => {
      const p = bySku.get(o.sku);
      if (!p) return [];
      return [{
        label: o.label,
        productId: p.id,
        sku: p.sku,
        slug: p.slug,
        name: p.name_mn,
        price: Number(p.price),
        stock: p.stock,
      }];
    }),
  })).filter((v) => v.options.length > 0);
}

/** Жимсний доод дүнд тооцогдох барааны id-нууд (сагс, захиалгын хуудас) */
export async function getFruitProductIdsPublic(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", "vidan-fruit")
    .maybeSingle();
  // Брэнд идэвхгүй тул RLS-ээр харагдахгүй байж болно — SKU-аар нөөцөлнө
  const q = supabase.from("products").select("id").eq("is_active", true);
  const { data } = brand?.id ? await q.eq("brand_id", brand.id) : await q.in("sku", FRUIT_SKUS);
  return (data ?? []).map((p) => p.id);
}

/** Бүтэн хайрцгийн id-нууд — хүргэлтийн тооцоонд (0054, shippingUnits) */
export async function getShippingBoxIdsPublic(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select("id")
    .eq("shipping_box", true)
    .eq("is_active", true);
  return (data ?? []).map((p) => p.id);
}
