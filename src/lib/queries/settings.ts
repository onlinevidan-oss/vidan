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
  badge: "🌱 Үндэсний үйлдвэрлэл · 1998 оноос",
  title: "Эрүүл хөрсөнд\nургуулсан эрүүл хүнс",
  body: "VIDAN брэндийн 100% цэвэр, хүнсний нэмэлтгүй даршилсан ногоо, жимсний чанамал болон хүүхдийн тэжээл — Монгол хөрсөнд ургуулсан түүхий эдээр.",
  btn_label: "Бүтээгдэхүүн үзэх →",
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
