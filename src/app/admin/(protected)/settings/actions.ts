"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BrochurePage,
  CommerceSettings,
  HeroSettings,
  HeroSlide,
  SaleCampaign,
  SmsSettings,
} from "@/lib/queries/settings";

function isSafeImageUrl(url: string): boolean {
  if (url.startsWith("/")) return true; // /public дотрох зам
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.startsWith(`${base}/storage/v1/object/public/`);
}

export async function updateHeroSettings(
  payload: HeroSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const imageUrl = payload.image_url.trim();
  if (imageUrl && !isSafeImageUrl(imageUrl)) {
    return { ok: false, error: "Зургийн URL зөвшөөрөгдөхгүй" };
  }

  const value: HeroSettings = {
    badge:     payload.badge.trim(),
    title:     payload.title.trim(),
    body:      payload.body.trim(),
    btn_label: payload.btn_label.trim(),
    btn_href:  payload.btn_href.trim(),
    image_url: imageUrl,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "hero", value, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Hero slides (нүүр хуудасны эргэлддэг постерууд) хадгалах.
 * Хоосон (зураг ч, гарчиг ч байхгүй) слайдыг алгасна.
 */
export async function updateHeroSlides(
  slides: HeroSlide[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!Array.isArray(slides)) {
    return { ok: false, error: "Слайдын жагсаалт буруу" };
  }
  if (slides.length > 12) {
    return { ok: false, error: "Хамгийн ихдээ 12 слайд" };
  }

  const cleaned: HeroSlide[] = [];
  for (const s of slides) {
    const imageUrl = (s.image_url || "").trim();
    if (imageUrl && !isSafeImageUrl(imageUrl)) {
      return { ok: false, error: "Зургийн URL зөвшөөрөгдөхгүй" };
    }
    if (!imageUrl && !(s.title || "").trim()) continue; // хоосон слайд
    cleaned.push({
      badge: (s.badge || "").trim(),
      title: (s.title || "").trim(),
      body: (s.body || "").trim(),
      btn_label: (s.btn_label || "").trim(),
      btn_href: (s.btn_href || "").trim(),
      image_url: imageUrl,
    });
  }

  if (cleaned.length === 0) {
    return { ok: false, error: "Дор хаяж нэг зурагтай слайд шаардлагатай" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: "hero_slides",
    value: { slides: cleaned },
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Худалдааны тохиргоо (хүргэлт, доод дүн, үнэгүй хүргэлт) хадгалах.
 * DB-ийн calc_order_totals() мөн эдгээр утгыг site_settings-ээс уншдаг тул
 * энд хадгалмагц захиалгын сервер тал ч шинэ дүрмээр тооцно.
 */
export async function updateCommerceSettings(
  payload: CommerceSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const minOrder = Math.round(Number(payload.min_order_amount));
  const shipping = Math.round(Number(payload.shipping_base));
  const shipOver = Math.round(Number(payload.shipping_over));
  const qtyThresh = Math.round(Number(payload.shipping_qty_threshold));
  const freeMin  = Math.round(Number(payload.free_shipping_min));

  if (!Number.isFinite(minOrder) || minOrder < 0 || minOrder > 10_000_000) {
    return { ok: false, error: "Захиалгын доод дүн буруу байна" };
  }
  if (!Number.isFinite(shipping) || shipping < 0 || shipping > 1_000_000) {
    return { ok: false, error: "Хүргэлтийн төлбөр буруу байна" };
  }
  if (!Number.isFinite(shipOver) || shipOver < 0 || shipOver > 1_000_000) {
    return { ok: false, error: "Хүргэлтийн (олон ширхэг) төлбөр буруу байна" };
  }
  if (!Number.isFinite(qtyThresh) || qtyThresh < 1 || qtyThresh > 1_000) {
    return { ok: false, error: "Ширхгийн босго буруу байна" };
  }
  if (!Number.isFinite(freeMin) || freeMin < 0 || freeMin > 100_000_000) {
    return { ok: false, error: "Үнэгүй хүргэлтийн босго буруу байна" };
  }

  const value: CommerceSettings = {
    min_order_amount: minOrder,
    shipping_base: shipping,
    shipping_over: shipOver,
    shipping_qty_threshold: qtyThresh,
    free_shipping_enabled: !!payload.free_shipping_enabled,
    free_shipping_min: freeMin,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "commerce", value, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Танилцуулга (PDF-ээс хөрвүүлсэн хуудсууд) хадгалах.
 * Хуудсын зургийг браузер талд PDF-ээс гаргаж, Supabase storage-д
 * байршуулсны дараа энэ action зөвхөн URL жагсаалтыг баталгаажуулж хадгална.
 * pages хоосон бол танилцуулгыг устгана.
 */
export async function updateAboutBrochure(
  payload: { title: string; pages: BrochurePage[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const pages = Array.isArray(payload?.pages) ? payload.pages : [];
  if (pages.length > 60) {
    return { ok: false, error: "Хамгийн ихдээ 60 хуудас" };
  }

  const cleaned: BrochurePage[] = [];
  for (const p of pages) {
    const url = (p?.url || "").trim();
    if (!isSafeImageUrl(url)) {
      return { ok: false, error: "Хуудасны URL зөвшөөрөгдөхгүй" };
    }
    const width = Math.round(Number(p.width));
    const height = Math.round(Number(p.height));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return { ok: false, error: "Хуудасны хэмжээ буруу байна" };
    }
    cleaned.push({ url, width, height });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: "about_brochure",
    value: { title: (payload.title || "Танилцуулга").trim(), pages: cleaned },
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/about");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Хямдралын кампанит ажил хадгалах.
 *
 * Хадгалмагц sync_sale_campaign()-ийг ШУУД дуудна — админ цаг тутмын
 * cron хүлээхгүйгээр үр дүнг нь тэр дороо харна. Функц идемпотент тул
 * давхар дуудагдахад асуудалгүй.
 */
export async function updateSaleCampaign(
  payload: SaleCampaign,
): Promise<
  | { ok: true; active: boolean; applied: number; reverted: number }
  | { ok: false; error: string }
> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const percent = Number(payload.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
    return { ok: false, error: "Хямдралын хувь 1–99 хооронд байх ёстой" };
  }
  if (!payload.brand_slug.trim()) {
    return { ok: false, error: "Брэндээ сонгоно уу" };
  }

  const starts = new Date(payload.starts_at);
  const ends = new Date(payload.ends_at);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
    return { ok: false, error: "Огноо буруу байна" };
  }
  if (ends <= starts) {
    return { ok: false, error: "Дуусах огноо эхлэхээсээ хойш байх ёстой" };
  }

  const value: SaleCampaign = {
    // Код солигдоход хуучин хямдрал автоматаар буцдаг тул тогтвортой байлгана
    code: payload.code.trim() || "campaign",
    name: payload.name.trim(),
    brand_slug: payload.brand_slug.trim(),
    percent,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    enabled: !!payload.enabled,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: "sale_campaign",
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  // Үнийг тэр дороо тохируулна (service_role эрхээр)
  const admin = createAdminClient();
  const { data: synced, error: syncErr } = await admin.rpc("sync_sale_campaign");
  if (syncErr) return { ok: false, error: `Хадгалсан ч үнэ тохируулж чадсангүй: ${syncErr.message}` };

  const res = (synced ?? {}) as { active?: boolean; applied?: number; reverted?: number };

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/settings");

  return {
    ok: true,
    active: !!res.active,
    applied: res.applied ?? 0,
    reverted: res.reverted ?? 0,
  };
}

/**
 * SMS мэдэгдлийн тохиргоо хадгалах.
 * Загварт {order}, {total} орлуулагддаг.
 */
export async function updateSmsSettings(
  payload: SmsSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const paid = payload.paid_template.trim();
  const cancelled = payload.cancelled_template.trim();

  if (payload.paid_enabled && !paid) {
    return { ok: false, error: "Баталгаажсан SMS-ийн текст хоосон байна" };
  }
  if (payload.cancelled_enabled && !cancelled) {
    return { ok: false, error: "Цуцлагдсан SMS-ийн текст хоосон байна" };
  }
  // Хэт урт SMS = олон segment = илүү төлбөр. 3 segment-ээр хязгаарлав.
  if (paid.length > 210 || cancelled.length > 210) {
    return { ok: false, error: "SMS хэт урт байна (дээд тал нь 210 тэмдэгт)" };
  }

  const value: SmsSettings = {
    paid_enabled: !!payload.paid_enabled,
    paid_template: paid,
    cancelled_enabled: !!payload.cancelled_enabled,
    cancelled_template: cancelled,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: "sms_settings",
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}
