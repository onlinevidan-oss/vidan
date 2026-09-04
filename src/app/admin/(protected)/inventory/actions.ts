"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isValidDateKey } from "@/lib/report-period";
import { ubDayStart } from "@/lib/datetime";

export type StockInResult =
  | { ok: true; newStock: number }
  | { ok: false; error: string };

/**
 * Агуулахын ОРЛОГО бүртгэх — үлдэгдэл дээр нэмнэ.
 *
 * Тоог энд шууд update хийхгүй: `record_stock_in` RPC нь products.stock ба
 * stock_movements хоёрыг ЗЭРЭГ шинэчилдэг тул тэнцэл задрахгүй.
 */
export async function recordStockIn(input: {
  productId: string;
  quantity: number;
  /** "YYYY-MM-DD" (УБ өдөр). Хоосон бол өнөөдөр. */
  date?: string;
  note?: string;
}): Promise<StockInResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const qty = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(qty) || qty === 0) {
    return { ok: false, error: "Тоо ширхэг 0-ээс өөр бүхэл тоо байх ёстой" };
  }
  if (Math.abs(qty) > 1_000_000) {
    return { ok: false, error: "Тоо ширхэг хэт том байна" };
  }

  const date = input.date?.trim();
  if (date && !isValidDateKey(date)) {
    return { ok: false, error: "Огноо буруу байна" };
  }
  // УБ өдрийн эхлэл — тайлан огноогоор шүүхэд зөв хэсэгт унана
  const occurredAt = date ? ubDayStart(date).toISOString() : new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_stock_in", {
    p_product_id: input.productId,
    p_qty: qty,
    p_note: input.note?.trim() || null,
    p_occurred_at: occurredAt,
  });

  if (error) {
    const msg = error.message.includes("FORBIDDEN")
      ? "Танд эрх алга"
      : error.message.includes("PRODUCT_NOT_FOUND")
        ? "Бүтээгдэхүүн олдсонгүй"
        : error.message.includes("INVALID_QUANTITY")
          ? "Тоо ширхэг буруу"
          : error.message;
    return { ok: false, error: msg };
  }

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/reports");
  return { ok: true, newStock: Number(row?.new_stock ?? 0) };
}
