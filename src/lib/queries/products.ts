/**
 * Бүтээгдэхүүний query-үүд (Server-side)
 */
import { createClient } from "@/lib/supabase/server";

const PRODUCT_SELECT = `
  *,
  category:categories(id, name_mn, slug, color_gradient),
  images:product_images(id, url, sort_order)
`;

const PRODUCT_SELECT_WITH_INNER_CAT = `
  *,
  category:categories!inner(id, name_mn, slug, color_gradient),
  images:product_images(id, url, sort_order)
`;

export async function getFeaturedProducts(limit = 4) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
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
    .select(PRODUCT_SELECT)
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
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name_mn, slug, emoji, color_gradient")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("products").select("category_id").eq("is_active", true),
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

// =========================================================
// Catalog
// =========================================================

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name";

export async function getProducts(opts: {
  categorySlug?: string;
  isNew?: boolean;
  saleOnly?: boolean;
  search?: string;
  sort?: ProductSort;
  limit?: number;
} = {}) {
  const supabase = await createClient();

  let q = supabase
    .from("products")
    .select(PRODUCT_SELECT_WITH_INNER_CAT)
    .eq("is_active", true);

  if (opts.categorySlug) q = q.eq("category.slug", opts.categorySlug);
  if (opts.isNew) q = q.eq("is_new", true);
  if (opts.saleOnly) q = q.not("old_price", "is", null);
  if (opts.search && opts.search.trim()) {
    q = q.ilike("name_mn", `%${opts.search.trim()}%`);
  }

  switch (opts.sort) {
    case "price-asc":  q = q.order("price", { ascending: true }); break;
    case "price-desc": q = q.order("price", { ascending: false }); break;
    case "name":       q = q.order("name_mn", { ascending: true }); break;
    case "newest":
    default:           q = q.order("created_at", { ascending: false });
  }

  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name_mn, slug, emoji, color_gradient),
      images:product_images(id, url, sort_order)
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRelatedProducts(
  categoryId: string,
  excludeId: string,
  limit = 4,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
