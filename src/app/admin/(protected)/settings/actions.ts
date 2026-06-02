"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import type { HeroSettings } from "@/lib/queries/settings";

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
