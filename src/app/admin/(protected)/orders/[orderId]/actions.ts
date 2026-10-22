"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin-guard";
import { canTransition, type OrderStatus, ORDER_STATUSES, STATUS_LABEL } from "@/lib/order-status";
import { sendCourierEnteredSms, sendOrderSms } from "@/lib/sms/notifications";
import { logStaffActivity } from "@/lib/staff-activity";
import type { Database } from "@/lib/supabase/database.types";

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  // 1. Staff guard
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: guard.error };

  // 2. Status whitelist
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = await createClient();

  // 3. State machine: одоогийн статус татаж шилжилт боломжтой эсэхийг шалгах
  const { data: cur } = await supabase
    .from("orders")
    .select("status, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Захиалга олдсонгүй" };

  if (cur.status === status) {
    return { ok: false, error: "Аль хэдийн ийм төлөвт байна" };
  }
  if (!canTransition(cur.status as OrderStatus, status)) {
    return {
      ok: false,
      error: `${cur.status} → ${status} шилжилт зөвшөөрөгдөхгүй`,
    };
  }

  // 4. UPDATE — delivered_at / cancelled_at тэмдэглэх ба урвуу шилжилтэд цэвэрлэх
  const update: OrderUpdate = { status };
  if (status === "delivered") {
    update.delivered_at = new Date().toISOString();
  } else {
    update.delivered_at = null;
  }
  if (status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancelled_reason = (reason ?? "Админ цуцалсан").slice(0, 500);
  } else {
    update.cancelled_at = null;
    update.cancelled_reason = null;
  }

  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  // 5. Timeline event (алдвал silently log хийнэ — захиалгын төлөв амжилттай шинэчилэгдсэн)
  const { error: evtErr } = await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: `status_${status}`,
    description: `Төлөв шинэчилэгдсэн: ${status}`,
    created_by: guard.staff.id,
  });
  if (evtErr) console.error("[order event insert failed]", evtErr);

  await logStaffActivity({
    action: "order_status",
    summary: `${cur.order_number} төлөв → ${STATUS_LABEL[status] ?? status}`,
    entityType: "order",
    entityId: orderId,
  });

  // Хүргэлтийн явцын SMS илгээхээ БОЛЬСОН. Хэрэглэгч захиалгынхаа
  // хуудсан дээрх "Захиалгын явц" хэсгээс real-time хардаг.
  // Цуцлалт нь явцын мэдээлэл биш, төлсөн мөнгөтэй холбоотой тул хэвээр.
  if (status === "cancelled") {
    await sendOrderSms(orderId, "cancelled");
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

export async function markAsPaid(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data: paidRow, error } = await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId)
    .select("order_number")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  const { error: evtErr } = await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "paid",
    description: "Төлбөр баталгаажсан",
    created_by: guard.staff.id,
  });
  if (evtErr) console.error("[order event insert failed]", evtErr);

  await logStaffActivity({
    action: "order_paid",
    summary: `${paidRow?.order_number ?? "Захиалга"} — гараар төлөгдсөн болгосон`,
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

const ENTER_ERRORS: Record<string, string> = {
  NOT_STAFF: "Хандах эрх алга",
  ORDER_NOT_FOUND: "Захиалга олдсонгүй",
  ORDER_NOT_ACTIVE: "Төлөгдөөгүй эсвэл цуцлагдсан захиалгыг шивэх боломжгүй",
};

/**
 * "Шивсэн" — захиалгыг гадны хүргэлтийн компанид оруулсныг тэмдэглэж,
 * эзэнд SMS явуулна. Тэмдэглэгээ, захиалгын түүх, ажилтны түүх нь
 * mark_courier_entered (0046) дотор нэг гүйлгээнд; аль хэдийн шивсэн бол
 * дахин тэмдэглэхгүй, SMS давхар явахгүй.
 */
export async function markCourierEntered(orderId: string): Promise<
  | { ok: true; enteredAt: string; enteredBy: string; already: boolean }
  | { ok: false; error: string }
> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_courier_entered", {
    p_order_id: orderId,
  });
  if (error) {
    return { ok: false, error: ENTER_ERRORS[error.message] ?? error.message };
  }
  const row = data?.[0];
  if (!row) return { ok: false, error: "Хариу ирсэнгүй" };

  if (row.newly_marked) {
    await sendCourierEnteredSms(orderId, row.entered_by_name);
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return {
    ok: true,
    enteredAt: row.entered_at,
    enteredBy: row.entered_by_name,
    already: !row.newly_marked,
  };
}
