"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isValidDateKey } from "@/lib/report-period";
import { ubDayStart } from "@/lib/datetime";

export type StockInResult =
  | { ok: true; newStock: number }
  | { ok: false; error: string };

/** Гараар бүртгэх хөдөлгөөний төрөл */
export type StockMovementKind = "in" | "out" | "adjust";

/** RPC-ийн алдааг хүнд ойлгомжтой болгоно */
function humanError(message: string): string {
  if (message.includes("FORBIDDEN")) return "Танд эрх алга";
  if (message.includes("PRODUCT_NOT_FOUND")) return "Бүтээгдэхүүн олдсонгүй";
  if (message.includes("INVALID_QUANTITY")) return "Тоо ширхэг буруу";
  if (message.includes("INVALID_KIND")) return "Хөдөлгөөний төрөл буруу";
  if (message.includes("INSUFFICIENT_STOCK")) {
    return "Үлдэгдэл хүрэлцэхгүй — агуулахын тоо сөрөг болно";
  }
  return message;
}

/**
 * Агуулахын хөдөлгөөн бүртгэх — орлого, зарлага, тооллогын засвар.
 *
 * Тоог шууд update хийхгүй: RPC нь products.stock ба stock_movements
 * хоёрыг ЗЭРЭГ шинэчилдэг тул тэнцэл задрахгүй.
 *
 *  · in     — орлого, тоо эерэг
 *  · out    — зарлага (гэмтэл, дотоод хэрэглээ), тоог эерэгээр өгнө
 *  · adjust — тооллогын засвар, тэмдэгтэй (+/−)
 */
export async function recordStockMovement(input: {
  productId: string;
  kind: StockMovementKind;
  quantity: number;
  /** "YYYY-MM-DD" (УБ өдөр). Хоосон бол өнөөдөр. */
  date?: string;
  note?: string;
}): Promise<StockInResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!["in", "out", "adjust"].includes(input.kind)) {
    return { ok: false, error: "Хөдөлгөөний төрөл буруу" };
  }

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
  const occurredAt = date ? ubDayStart(date).toISOString() : new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_stock_movement", {
    p_product_id: input.productId,
    p_kind: input.kind,
    p_qty: qty,
    p_note: input.note?.trim() || undefined,
    p_occurred_at: occurredAt,
  });

  if (error) return { ok: false, error: humanError(error.message) };

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/movements");
  revalidatePath("/admin/reports");
  return { ok: true, newStock: Number(row?.new_stock ?? 0) };
}
