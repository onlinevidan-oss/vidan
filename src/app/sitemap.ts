import type { MetadataRoute } from "next";

const BASE = "https://www.vidan.mn";

/** Идэвхтэй бүтээгдэхүүний slug-уудыг Supabase REST-ээс (anon) авна */
async function getProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !key) {
      console.error("Sitemap: Supabase environment variables are missing");
      return [];
    }
    const url = `${baseUrl}/rest/v1/products?select=slug,updated_at&is_active=eq.true`;
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`Sitemap: product query failed with ${res.status}`);
      return [];
    }
    return (await res.json()) as { slug: string; updated_at: string }[];
  } catch (error) {
    console.error("Sitemap: failed to load product slugs", error);
    return [];
  }
}

async function getActiveSlugs(table: "brands" | "categories"): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !key) return [];
  try {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?select=slug&is_active=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return ((await response.json()) as Array<{ slug: string }>).map((item) => item.slug);
  } catch (error) {
    console.error(`Sitemap: failed to load ${table}`, error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands, categories] = await Promise.all([
    getProductSlugs(),
    getActiveSlugs("brands"),
    getActiveSlugs("categories"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/feedback`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/delivery`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/payment-info`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/returns`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const landingRoutes: MetadataRoute.Sitemap = [
    ...brands.map((slug) => ({ url: `${BASE}/brands/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...categories.map((slug) => ({ url: `${BASE}/categories/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];

  return [...staticRoutes, ...landingRoutes, ...productRoutes];
}
