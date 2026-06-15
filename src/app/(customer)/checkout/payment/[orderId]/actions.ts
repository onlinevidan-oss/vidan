"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifyAndMarkPaid } from "@/lib/qpay/orders";

export type PaymentCheckResult =
  | { ok: true; status: "paid" | "pending" }
  | { ok: false; error: string };

/**
 * Хэрэглэгчийн талаас polling-аар төлбөр шалгах.
 * Эзэмшлийг (RLS-ээр) баталгаажуулсны дараа qPay-ээс check хийнэ.
 */
export async function checkPaymentStatus(
  orderId: string,
): Promise<PaymentCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтэрнэ үү" };

  // Энэ захиалга үнэхээр энэ хэрэглэгчийнх мөн эсэх (RLS)
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_status")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) return { ok: false, error: "Захиалга олдсонгүй" };
  if (order.payment_status === "paid") return { ok: true, status: "paid" };

  try {
    const status = await verifyAndMarkPaid(orderId);
    if (status === "not_found") {
      return { ok: false, error: "Нэхэмжлэл олдсонгүй" };
    }
    if (status === "paid") {
      revalidatePath(`/account/orders/${orderId}`);
      revalidatePath("/admin/orders");
    }
    return { ok: true, status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Төлбөр шалгахад алдаа гарлаа",
    };
  }
}
