"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

const VALID = ["new", "preparing", "shipping", "delivered", "cancelled"] as const;

export async function updateOrderStatus(
  orderId: string,
  status: (typeof VALID)[number],
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!VALID.includes(status)) return { ok: false, error: "Invalid status" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const update: OrderUpdate = { status };
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  if (status === "cancelled") {
    update.cancelled_at = new Date().toISOString();
    update.cancelled_reason = reason ?? "Админ цуцалсан";
  }

  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  // Timeline event
  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: `status_${status}`,
    description: `Төлөв шинэчилэгдсэн: ${status}`,
    created_by: user.id,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

export async function markAsPaid(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "paid",
    description: "Төлбөр баталгаажсан",
    created_by: user.id,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
