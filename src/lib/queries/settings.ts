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
