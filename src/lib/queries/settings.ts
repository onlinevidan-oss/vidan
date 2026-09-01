import { createClient } from "@/lib/supabase/server";

export type HeroSettings = {
  badge: string;
  title: string;
  body: string;
  btn_label: string;
  btn_href: string;
  image_url: string;
};

const HERO_DEFAULTS: HeroSettings = {
  badge: "Үндэсний үйлдвэрлэл · 1996 оноос",
  title: "Эрүүл хөрсөнд ургуулсан эрүүл хүнс",
  body: "VIDAN брэндийн 100% цэвэр, нэмэлтгүй даршилсан ногоо, жимсний чанамал, нухаш болон зөгийн бал.",
  btn_label: "Бүтээгдэхүүн үзэх",
  btn_href: "/products",
  image_url: "/vidan-leaf.png",
};

export async function getHeroSettings(): Promise<HeroSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "hero")
    .maybeSingle();

  if (!data?.value) return HERO_DEFAULTS;
  return { ...HERO_DEFAULTS, ...(data.value as Partial<HeroSettings>) };
}

// ============================================================
// Hero slides (нүүр хуудасны эргэлддэг постерууд) — админ хэсгээс удирдана.
// site_settings key='hero_slides', value = { slides: HeroSlide[] }.
// Байхгүй бол одоогийн ганц hero-г нэг slide болгож буцаана (backward compat).
// ============================================================
export type HeroSlide = HeroSettings;

const SLIDE_EMPTY: HeroSlide = {
  badge: "",
  title: "",
  body: "",
  btn_label: "",
  btn_href: "",
  image_url: "",
};

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "hero_slides")
    .maybeSingle();

  const raw = (data?.value as { slides?: Partial<HeroSlide>[] } | null)?.slides;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((s) => ({ ...SLIDE_EMPTY, ...s }))
      .filter((s) => s.image_url || s.title);
  }
  // Fallback — одоогийн ганц hero-г эхний slide болгоно
  return [await getHeroSettings()];
}

// ============================================================
// Худалдааны тохиргоо (хүргэлт, доод дүн) — админ хэсгээс удирдана.
// DB-ийн calc_order_totals() энэ утгуудыг мөн адил уншдаг тул
// client/server хоёр тал үргэлж ижил тооцоолно.
// Type + defaults нь client-safe pricing.ts дотор байрлана.
// ============================================================
import {
  COMMERCE_DEFAULTS,
  type CommerceSettings,
} from "@/lib/pricing";

export { COMMERCE_DEFAULTS, type CommerceSettings };

export async function getCommerceSettings(): Promise<CommerceSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "commerce")
    .maybeSingle();

  if (!data?.value) return COMMERCE_DEFAULTS;
  return { ...COMMERCE_DEFAULTS, ...(data.value as Partial<CommerceSettings>) };
}

// ============================================================
// Танилцуулга (PDF) — админ хэсгээс PDF байршуулахад хуудас бүр
// зураг болж хөрвөж, дараалалтайгаар энд хадгалагдана.
// site_settings key='about_brochure'.
// ============================================================
export type BrochurePage = { url: string; width: number; height: number };

export type AboutBrochure = {
  title: string;
  pages: BrochurePage[];
};

export async function getAboutBrochure(): Promise<AboutBrochure | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "about_brochure")
    .maybeSingle();

  const value = data?.value as Partial<AboutBrochure> | null;
  if (!value || !Array.isArray(value.pages) || value.pages.length === 0) {
    return null;
  }
  return {
    title: value.title || "Танилцуулга",
    pages: value.pages.filter((p) => p?.url),
  };
}

// ============================================================
// Хямдралын кампанит ажил — админ хэсгээс удирдана.
// Үнийг DB-д бодитоор солидог (place_order нь products.price уншдаг),
// хугацаанд нь sync_sale_campaign() автоматаар асааж/унтраана.
// ============================================================
export type SaleCampaign = {
  code: string;
  name: string;
  brand_slug: string;
  percent: number;
  /** ISO (UTC) */
  starts_at: string;
  /** ISO (UTC) */
  ends_at: string;
  enabled: boolean;
};

export const SALE_CAMPAIGN_DEFAULTS: SaleCampaign = {
  code: "campaign",
  name: "",
  brand_slug: "",
  percent: 10,
  starts_at: "",
  ends_at: "",
  enabled: false,
};

export async function getSaleCampaign(): Promise<SaleCampaign> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "sale_campaign")
    .maybeSingle();

  if (!data?.value) return SALE_CAMPAIGN_DEFAULTS;
  return { ...SALE_CAMPAIGN_DEFAULTS, ...(data.value as Partial<SaleCampaign>) };
}

/** Одоо хэдэн бараа энэ кампанит ажлаар хямдарсан бэ */
export async function getSaleCampaignCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .not("sale_campaign", "is", null);
  return count ?? 0;
}

// ============================================================
// SMS мэдэгдлийн тохиргоо — админ хэсгээс удирдана.
// Аль SMS явах, ямар текстээр явахыг кодод биш энд хадгална.
// ============================================================
export type SmsSettings = {
  paid_enabled: boolean;
  paid_template: string;
  cancelled_enabled: boolean;
  cancelled_template: string;
};

export const SMS_SETTINGS_DEFAULTS: SmsSettings = {
  paid_enabled: true,
  paid_template:
    "Таны {order} дугаартай захиалга баталгаажлаа. Таны захиалга 24 цагийн дотор хүргэгдэнэ баярлалаа. Видан",
  cancelled_enabled: true,
  cancelled_template: "VIDAN: Захиалга {order} цуцлагдлаа.",
};

export async function getSmsSettings(): Promise<SmsSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "sms_settings")
    .maybeSingle();

  if (!data?.value) return SMS_SETTINGS_DEFAULTS;
  return { ...SMS_SETTINGS_DEFAULTS, ...(data.value as Partial<SmsSettings>) };
}
