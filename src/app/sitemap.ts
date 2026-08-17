import type { MetadataRoute } from "next";

const BASE = "https://www.vidan.mn";

/** Идэвхтэй бүтээгдэхүүний slug-уудыг Supabase REST-ээс (anon) авна */
async function getProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/products?select=slug,updated_at&is_active=eq.true`;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as { slug: string; updated_at: string }[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getProductSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/feedback`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE}/products/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
