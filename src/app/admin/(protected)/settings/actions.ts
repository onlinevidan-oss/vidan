"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseRecipients } from "@/lib/sms/recipients";
import { logStaffActivity } from "@/lib/staff-activity";
import { sendSms } from "@/lib/sms/client";
import { getSmsSettings } from "@/lib/queries/settings";
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
    alt:       (payload.alt || "").trim(),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "hero", value, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  await logStaffActivity({ action: "settings_hero", summary: "Тохиргоо: нүүрний баннер засав", entityType: "settings" });

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
      alt: (s.alt || "").trim(),
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

  await logStaffActivity({
    action: "settings_hero_slides",
    summary: `Тохиргоо: нүүрний слайд засав (${cleaned.length} слайд)`,
    entityType: "settings",
  });

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
  const tier2Max  = Math.round(Number(payload.shipping_tier2_max));
  const stepQty   = Math.round(Number(payload.shipping_step_qty));
  const stepPrice = Math.round(Number(payload.shipping_step_price));
  const freeMin   = Math.round(Number(payload.free_shipping_min));

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
  if (!Number.isFinite(tier2Max) || tier2Max <= qtyThresh || tier2Max > 10_000) {
    return {
      ok: false,
      error: "2-р шатны дээд ширхэг нь босгоос их байх ёстой",
    };
  }
  if (!Number.isFinite(stepQty) || stepQty < 1 || stepQty > 1_000) {
    return { ok: false, error: "Нэмэгдэх ширхгийн алхам буруу байна" };
  }
  if (!Number.isFinite(stepPrice) || stepPrice < 0 || stepPrice > 1_000_000) {
    return { ok: false, error: "Нэмэгдэх хүргэлтийн төлбөр буруу байна" };
  }
  if (!Number.isFinite(freeMin) || freeMin < 0 || freeMin > 100_000_000) {
    return { ok: false, error: "Үнэгүй хүргэлтийн босго буруу байна" };
  }

  const value: CommerceSettings = {
    min_order_amount: minOrder,
    shipping_base: shipping,
    shipping_over: shipOver,
    shipping_qty_threshold: qtyThresh,
    shipping_tier2_max: tier2Max,
    shipping_step_qty: stepQty,
    shipping_step_price: stepPrice,
    free_shipping_enabled: !!payload.free_shipping_enabled,
    free_shipping_min: freeMin,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "commerce", value, updated_at: new Date().toISOString() });

  if (error) return { ok: false, error: error.message };

  await logStaffActivity({
    action: "settings_commerce",
    summary: "Тохиргоо: худалдаа (хүргэлт, доод дүн) засав",
    entityType: "settings",
  });

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

  await logStaffActivity({
    action: "settings_brochure",
    summary: `Тохиргоо: танилцуулга (${cleaned.length} хуудас)`,
    entityType: "settings",
  });

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

  await logStaffActivity({
    action: "settings_campaign",
    summary: `Тохиргоо: хямдрал «${value.name || value.code}» ${value.percent}% — ${value.enabled ? "асаалттай" : "унтраалттай"}`,
    entityType: "settings",
  });

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
  const unpaid = payload.unpaid_template.trim();
  const adminTpl = payload.admin_template.trim();
  const adminPhones = parseRecipients(payload.admin_phones);

  if (payload.paid_enabled && !paid) {
    return { ok: false, error: "Баталгаажсан SMS-ийн текст хоосон байна" };
  }
  if (payload.cancelled_enabled && !cancelled) {
    return { ok: false, error: "Цуцлагдсан SMS-ийн текст хоосон байна" };
  }
  if (payload.unpaid_enabled && !unpaid) {
    return { ok: false, error: "Сануулга SMS-ийн текст хоосон байна" };
  }
  if (adminPhones.invalid.length > 0) {
    return {
      ok: false,
      error: `Админы дугаар буруу байна: ${adminPhones.invalid.join(", ")}`,
    };
  }
  if (payload.admin_enabled && adminPhones.valid.length === 0) {
    return { ok: false, error: "Мэдэгдэл авах админы дугаар оруулна уу" };
  }
  if (payload.admin_enabled && !adminTpl) {
    return { ok: false, error: "Админы мэдэгдлийн текст хоосон байна" };
  }
  const enteredTpl = (payload.entered_template ?? "").trim();
  const enteredPhones = parseRecipients(payload.entered_phones ?? "");
  if (enteredPhones.invalid.length > 0) {
    return {
      ok: false,
      error: `"Шивсэн" мэдэгдлийн дугаар буруу байна: ${enteredPhones.invalid.join(", ")}`,
    };
  }
  if (payload.entered_enabled && enteredPhones.valid.length === 0) {
    return { ok: false, error: "\"Шивсэн\" мэдэгдэл авах дугаар оруулна уу" };
  }
  if (payload.entered_enabled && !enteredTpl) {
    return { ok: false, error: "\"Шивсэн\" мэдэгдлийн текст хоосон байна" };
  }
  // Хэт урт SMS = олон segment = илүү төлбөр. 3 segment-ээр хязгаарлав.
  if (
    paid.length > 210 ||
    cancelled.length > 210 ||
    unpaid.length > 210 ||
    adminTpl.length > 210 ||
    enteredTpl.length > 210
  ) {
    return { ok: false, error: "SMS хэт урт байна (дээд тал нь 210 тэмдэгт)" };
  }

  // Сануулга нь захиалга цуцлагдахаас (120 мин) өмнө очих ёстой —
  // эс бөгөөс аль хэдийн хаагдсан захиалгыг төл гэж хэлнэ.
  const afterMinutes = Math.round(Number(payload.unpaid_after_minutes));
  if (!Number.isFinite(afterMinutes) || afterMinutes < 5 || afterMinutes > 110) {
    return {
      ok: false,
      error: "Сануулгын хугацаа 5-110 минутын хооронд байх ёстой",
    };
  }

  const value: SmsSettings = {
    paid_enabled: !!payload.paid_enabled,
    paid_template: paid,
    cancelled_enabled: !!payload.cancelled_enabled,
    cancelled_template: cancelled,
    unpaid_enabled: !!payload.unpaid_enabled,
    unpaid_template: unpaid,
    unpaid_after_minutes: afterMinutes,
    admin_enabled: !!payload.admin_enabled,
    admin_phones: adminPhones.valid.join(", "),
    admin_template: adminTpl,
    entered_enabled: !!payload.entered_enabled,
    entered_phones: enteredPhones.valid.join(", "),
    entered_template: enteredTpl,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: "sms_settings",
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  await logStaffActivity({ action: "settings_sms", summary: "Тохиргоо: SMS мэдэгдэл засав", entityType: "settings" });

  revalidatePath("/admin/settings");
  return { ok: true };
}

// ============================================================
// Масс SMS (0047) — хуваарьт илгээлт
// ============================================================

/** Хуваарьт масс SMS нэмэх. date/time нь УБ цагаар ("2026-10-28", "19:00") */
export async function scheduleBroadcast(payload: {
  text: string;
  date: string;
  time: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const text = payload.text.trim();
  if (!text) return { ok: false, error: "Текст хоосон байна" };
  if (text.length > 300) return { ok: false, error: "Текст хэт урт (300 тэмдэгтээс ихгүй)" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || !/^\d{2}:\d{2}$/.test(payload.time)) {
    return { ok: false, error: "Огноо, цаг буруу байна" };
  }
  const sendAt = new Date(`${payload.date}T${payload.time}:00+08:00`);
  if (Number.isNaN(sendAt.getTime())) return { ok: false, error: "Огноо, цаг буруу байна" };
  if (sendAt.getTime() < Date.now() - 60_000) return { ok: false, error: "Өнгөрсөн цаг сонгосон байна" };
  const hour = Number(payload.time.slice(0, 2));
  if (hour >= 22 || hour < 8) return { ok: false, error: "Шөнө (22:00–08:00) илгээхгүй — өөр цаг сонгоно уу" };

  const supabase = await createClient();
  const { error } = await supabase.from("sms_broadcasts").insert({
    text,
    send_at: sendAt.toISOString(),
    created_by: guard.staff.id,
  });
  if (error) return { ok: false, error: error.message };

  await logStaffActivity({
    action: "sms_broadcast_schedule",
    summary: `Масс SMS хуваарьт нэмэв: ${payload.date} ${payload.time}`,
    entityType: "settings",
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Хүлээгдэж буй масс SMS-ийг цуцлах */
export async function cancelBroadcast(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sms_broadcasts")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "scheduled")
    .select("send_at");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Аль хэдийн илгээгдэж эхэлсэн эсвэл олдсонгүй" };

  await logStaffActivity({
    action: "sms_broadcast_cancel",
    summary: `Масс SMS цуцлав (${new Date(data[0].send_at).toISOString().slice(0, 16)} UTC)`,
    entityType: "settings",
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Туршилт — зөвхөн админы мэдэгдлийн эхний дугаар руу нэг SMS */
export async function sendBroadcastTest(
  text: string,
): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const t = text.trim();
  if (!t) return { ok: false, error: "Текст хоосон байна" };
  const sms = await getSmsSettings();
  const to = parseRecipients(sms.admin_phones).valid[0];
  if (!to) return { ok: false, error: "Админы дугаар тохируулаагүй (SMS → Шинэ захиалга)" };

  try {
    await sendSms({ to, text: t });
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e) };
  }
  await logStaffActivity({ action: "sms_broadcast_test", summary: `Масс SMS туршилт → ${to}`, entityType: "settings" });
  return { ok: true, to };
}
