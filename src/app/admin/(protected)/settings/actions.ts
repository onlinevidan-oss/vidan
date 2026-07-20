"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import type { CommerceSettings, HeroSettings } from "@/lib/queries/settings";

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
  const freeMin  = Math.round(Number(payload.free_shipping_min));

  if (!Number.isFinite(minOrder) || minOrder < 0 || minOrder > 10_000_000) {
    return { ok: false, error: "Захиалгын доод дүн буруу байна" };
  }
  if (!Number.isFinite(shipping) || shipping < 0 || shipping > 1_000_000) {
    return { ok: false, error: "Хүргэлтийн төлбөр буруу байна" };
  }
  if (!Number.isFinite(freeMin) || freeMin < 0 || freeMin > 100_000_000) {
    return { ok: false, error: "Үнэгүй хүргэлтийн босго буруу байна" };
  }

  const value: CommerceSettings = {
    min_order_amount: minOrder,
    shipping_base: shipping,
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
