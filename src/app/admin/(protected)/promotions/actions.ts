"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { ubAddDays, ubDayStart } from "@/lib/datetime";
import { normalizePromoCode, validatePromo, type PromoInput } from "@/lib/promo";

type Result = { ok: true } | { ok: false; error: string };

/** Формын утгыг promotions хүснэгтийн мөр болгоно */
function toRow(p: PromoInput) {
  return {
    code: p.code,
    name: p.name.trim(),
    type: p.type,
    value: p.value,
    min_order: p.min_order,
    // Тогтмол дүнд дээд хязгаар утгагүй
    max_discount: p.type === "percent" ? p.max_discount : null,
    segment: p.segment,
    starts_at: ubDayStart(p.starts_on).toISOString(),
    // Дуусах өдрийг ДУУСТАЛ хүчинтэй: тэр өдрийн 23:59:59 (УБ)
    ends_at: p.ends_on
      ? new Date(ubDayStart(ubAddDays(p.ends_on, 1)).getTime() - 1000).toISOString()
      : null,
    usage_limit: p.usage_limit,
    usage_per_user: p.usage_per_user,
    is_active: p.is_active,
  };
}

function clean(payload: PromoInput): PromoInput {
  return { ...payload, code: normalizePromoCode(payload.code ?? "") };
}

function humanError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Ийм кодтой урамшуулал аль хэдийн байна";
  return error.message;
}

export async function createPromo(payload: PromoInput): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const p = clean(payload);
  const invalid = validatePromo(p);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase.from("promotions").insert(toRow(p));
  if (error) return { ok: false, error: humanError(error) };

  revalidatePath("/admin/promotions");
  return { ok: true };
}

export async function updatePromo(id: string, payload: PromoInput): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const p = clean(payload);
  const invalid = validatePromo(p);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .update(toRow(p))
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: humanError(error) };
  if (!data || data.length === 0) return { ok: false, error: "Урамшуулал олдсонгүй" };

  revalidatePath("/admin/promotions");
  return { ok: true };
}

/** Асаах / унтраах — бусад талбарыг хөндөхгүй */
export async function setPromoActive(id: string, active: boolean): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .update({ is_active: active })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Урамшуулал олдсонгүй" };

  revalidatePath("/admin/promotions");
  return { ok: true };
}

/**
 * Устгах — зөвхөн НЭГ Ч УДАА ашиглагдаагүй кодыг.
 * Ашиглагдсан кодыг устгавал promo_redemptions (хэн, хэдэн төгрөгийн
 * хөнгөлөлт авсан) cascade-аар хамт арилж, тайлангийн мөр тасарна —
 * тиймээс унтраахыг л зөвшөөрнө.
 */
export async function deletePromo(id: string): Promise<Result> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const [{ data: promo }, { count }] = await Promise.all([
    supabase.from("promotions").select("usage_count").eq("id", id).maybeSingle(),
    supabase
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", id),
  ]);
  if (!promo) return { ok: false, error: "Урамшуулал олдсонгүй" };
  if (promo.usage_count > 0 || (count ?? 0) > 0) {
    return {
      ok: false,
      error: "Ашиглагдсан кодыг устгах боломжгүй — оронд нь унтраана уу",
    };
  }

  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/promotions");
  return { ok: true };
}
