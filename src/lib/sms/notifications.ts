/**
 * Захиалгын SMS мэдэгдэл (best-effort)
 *  · Төлбөр баталгаажих, хүргэлтийн төлөв өөрчлөгдөх үед хэрэглэгчид SMS илгээнэ.
 *  · SMS амжилтгүй болох нь гол урсгалыг ХЭЗЭЭ Ч тасалдуулахгүй — алдааг log хийгээд өнгөрнө.
 *  · Илгээсэн SMS бүрийг order_events-д тэмдэглэнэ.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, normalizePhone } from "./client";

type SmsKind = "paid" | "shipping" | "delivered" | "cancelled";

function buildText(
  kind: SmsKind,
  order: { order_number: string; total: number },
): string {
  // Кирилл SMS 70 тэмдэгт / segment тул богино байлгана.
  switch (kind) {
    case "paid":
      return `VIDAN: Захиалга ${order.order_number} батлагдлаа. Дүн: ${Number(order.total).toLocaleString("en-US")}₮. Баярлалаа!`;
    case "shipping":
      return `VIDAN: Захиалга ${order.order_number} хүргэлтэд гарлаа.`;
    case "delivered":
      return `VIDAN: Захиалга ${order.order_number} хүргэгдлээ. Баярлалаа!`;
    case "cancelled":
      return `VIDAN: Захиалга ${order.order_number} цуцлагдлаа.`;
  }
}

/**
 * Захиалгын эзэнд SMS илгээнэ (best-effort — алдаа шидэхгүй).
 * Амжилттай илгээвэл order_events-д sms_sent event нэмнэ.
 */
export async function sendOrderSms(
  orderId: string,
  kind: SmsKind,
): Promise<void> {
  try {
    // SMS тохиргоогүй орчинд (жишээ нь local dev) чимээгүй алгасна.
    if (!process.env.SMS_API_KEY || !process.env.SMS_FROM_NUMBER) return;

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("order_number, total, user_id, profiles:user_id(phone)")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return;

    const profile = Array.isArray(order.profiles)
      ? order.profiles[0]
      : order.profiles;
    const phone = normalizePhone(profile?.phone);
    if (!phone) return;

    const text = buildText(kind, order);
    const result = await sendSms({ to: phone, text });

    const { error: evtErr } = await admin.from("order_events").insert({
      order_id: orderId,
      event_type: "sms_sent",
      description: `SMS (${kind}) → ${phone} [${result.message_id}]`,
    });
    if (evtErr) console.error("[sms event insert failed]", evtErr);
  } catch (e) {
    console.error(`[sms send failed] order=${orderId} kind=${kind}`, e);
  }
}
