import "server-only";
import {
  COMMERCE_DEFAULTS,
  type CommerceSettings,
} from "@/lib/pricing";
import type {
  AboutBrochure,
  HeroSlide,
} from "@/lib/queries/settings";

async function getSetting<T>(key: string, revalidate: number): Promise<T | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  const response = await fetch(
    `${baseUrl}/rest/v1/site_settings?select=value&key=eq.${encodeURIComponent(key)}&limit=1`,
    {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      next: { revalidate, tags: [`site-setting:${key}`] },
    },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ value: T }>;
  return rows[0]?.value ?? null;
}

const HERO_DEFAULT: HeroSlide = {
  badge: "Үндэсний үйлдвэрлэл · 1996 оноос",
  title: "Эрүүл хөрсөнд ургуулсан эрүүл хүнс",
  body: "VIDAN брэндийн 100% цэвэр, нэмэлтгүй бүтээгдэхүүн.",
  btn_label: "Бүтээгдэхүүн үзэх",
  btn_href: "/products",
  image_url: "/vidan-leaf.png",
  alt: "",
};

export async function getPublicHeroSlides(): Promise<HeroSlide[]> {
  const value = await getSetting<{ slides?: Partial<HeroSlide>[] }>("hero_slides", 300);
  const slides = value?.slides?.map((slide) => ({ ...HERO_DEFAULT, ...slide }))
    .filter((slide) => slide.image_url || slide.title);
  return slides?.length ? slides : [HERO_DEFAULT];
}

export async function getPublicCommerceSettings(): Promise<CommerceSettings> {
  const value = await getSetting<Partial<CommerceSettings>>("commerce", 300);
  return { ...COMMERCE_DEFAULTS, ...(value ?? {}) };
}

/** "Жимс" хуудасны баннер — жимсний админы тохиргооноос (site_settings.fruit_banner) */
export const FRUIT_BANNER_DEFAULT = "/fruit/cover-jims2.jpg";
/** Баннерт нэгэн зэрэг байх зургийн дээд тоо */
export const FRUIT_BANNER_MAX = 8;

/** Тохиргооны утгаас зургийн жагсаалт (`{urls}`; хуучин `{url}` хэлбэрийг ч уншина) */
export function fruitBannerUrls(value: unknown): string[] {
  const v = (value ?? {}) as { urls?: unknown; url?: unknown };
  const urls = Array.isArray(v.urls) ? v.urls : typeof v.url === "string" ? [v.url] : [];
  return urls.filter((u): u is string => typeof u === "string" && u.length > 0).slice(0, FRUIT_BANNER_MAX);
}

/** Ээлжлэн солигдох баннерын зургууд — хоосон бол анхдагч зураг */
export async function getFruitBanners(): Promise<string[]> {
  const urls = fruitBannerUrls(await getSetting("fruit_banner", 60));
  return urls.length > 0 ? urls : [FRUIT_BANNER_DEFAULT];
}

export async function getPublicAboutBrochure(): Promise<AboutBrochure | null> {
  const value = await getSetting<Partial<AboutBrochure>>("about_brochure", 300);
  if (!value?.pages?.length) return null;
  return {
    title: value.title || "Танилцуулга",
    pages: value.pages.filter((page) => page?.url),
  };
}
