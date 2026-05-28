/**
 * Бүтээгдэхүүний query-үүд (Server-side ашиглах)
 */
import { createClient } from "@/lib/supabase/server";

export async function getFeaturedProducts(limit = 4) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name_mn, slug, color_gradient)")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getNewArrivals(limit = 4) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name_mn, slug, color_gradient)")
    .eq("is_active", true)
    .eq("is_new", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_mn, slug, emoji, color_gradient")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function getCategoriesWithProductCount() {
  const supabase = await createClient();
  // Note: product_count хэвийн query-ээр query хийх боломжтой
  // (RLS-ийн дор зөвхөн active product-ыг тоолно)
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name_mn, slug, emoji, color_gradient")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("products")
      .select("category_id")
      .eq("is_active", true),
  ]);

  const countByCategory = new Map<string, number>();
  (prods ?? []).forEach((p) => {
    if (p.category_id) {
      countByCategory.set(
        p.category_id,
        (countByCategory.get(p.category_id) ?? 0) + 1,
      );
    }
  });

  return (cats ?? []).map((c) => ({
    ...c,
    product_count: countByCategory.get(c.id) ?? 0,
  }));
}
