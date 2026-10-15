"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getEbarimtReceipt } from "@/lib/qpay/client";
import { parseReceiptAmounts } from "@/lib/ebarimt/check";

/** Нэг товшилтод QPay руу явуулах дээд хүсэлт — урт хүлээлгээс сэргийлнэ */
const MAX_PER_RUN = 60;

/**
 * Жагсаалтад байгаа баримтуудын бодит дүнг QPay-ээс дахин уншиж хадгална.
 * Зөвхөн УНШИНА — баримт үүсгэх, цуцлахгүй.
 */
export async function refreshEbarimtAmounts(
  orderIds: string[],
): Promise<
  | { ok: true; updated: number; failed: number; skipped: number }
  | { ok: false; error: string }
> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ids = [...new Set((orderIds ?? []).filter((x) => typeof x === "string"))];
  if (ids.length === 0) return { ok: true, updated: 0, failed: 0, skipped: 0 };

  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, ebarimt_id")
    .in("id", ids.slice(0, MAX_PER_RUN))
    .not("ebarimt_id", "is", null);
  if (error) return { ok: false, error: error.message };

  let updated = 0;
  let failed = 0;
  for (const o of orders ?? []) {
    try {
      const raw = await getEbarimtReceipt(o.ebarimt_id as string);
      const a = parseReceiptAmounts(raw);
      const { error: upErr } = await supabase
        .from("orders")
        .update({
          ebarimt_amount: a.amount,
          ebarimt_vat: a.vat,
          ebarimt_city_tax: a.cityTax,
          ebarimt_status: a.status,
          ebarimt_checked_at: new Date().toISOString(),
        })
        .eq("id", o.id);
      if (upErr) throw upErr;
      updated++;
    } catch (e) {
      failed++;
      console.error(`[ebarimt refresh failed] order=${o.id}`, e);
    }
  }

  revalidatePath("/admin/ebarimt");
  return {
    ok: true,
    updated,
    failed,
    skipped: Math.max(0, ids.length - MAX_PER_RUN),
  };
}
