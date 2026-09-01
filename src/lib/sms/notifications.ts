/**
 * Захиалгын SMS мэдэгдэл (best-effort)
 *  · Хэрэглэгчид ЗӨВХӨН хоёр тохиолдолд SMS явна:
 *      paid      — төлбөр баталгаажсан (захиалга бүрт нэг удаа)
 *      cancelled — захиалга цуцлагдсан
 *    Хүргэлтийн явцыг (бэлтгэж байна / хүргэлтэд / хүргэгдсэн) захиалгын
 *    хуудсан дээрх "Захиалгын явц" хэсэг real-time харуулна — SMS явуулахгүй.
 *  · SMS амжилтгүй болох нь гол урсгалыг ХЭЗЭЭ Ч тасалдуулахгүй — алдааг log хийгээд өнгөрнө.
 *  · Илгээсэн SMS бүрийг order_events-д тэмдэглэнэ.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, normalizePhone } from "./client";

export type SmsKind = "paid" | "cancelled";

function buildText(
  kind: SmsKind,
  order: { order_number: string; total: number },
): string {
  // Кирилл SMS 70 тэмдэгт / segment тул богино байлгана.
  switch (kind) {
    case "paid":
      return `VIDAN: Захиалга ${order.order_number} баталгаажлаа. 24 цагийн дотор хүргэгдэнэ.`;
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
      .select("order_number, total, user_id, contact_phone, profiles:user_id(phone)")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return;

    const profile = Array.isArray(order.profiles)
      ? order.profiles[0]
      : order.profiles;
    // Захиалга дээр хадгалсан хүргэлтийн утас тэргүүн эрэмбэтэй — имэйлээр
    // нэвтэрсэн хэрэглэгчид профайлд утас байхгүй тул зөвхөн үүнээс олдоно.
    const phone = normalizePhone(order.contact_phone) || normalizePhone(profile?.phone);
    if (!phone) return;

    // ДАВХАР ИЛГЭЭХЭЭС СЭРГИЙЛЭХ: илгээхийн ӨМНӨ тэмдэглэгээ бичнэ.
    // order_events дээрх unique index (0024) хоёр дахь бичилтийг таслах тул
    // QPay-ийн callback болон polling зэрэг ажилласан ч SMS нэг л удаа явна.
    const eventType = `sms_${kind}`;
    const { error: claimErr } = await admin.from("order_events").insert({
      order_id: orderId,
      event_type: eventType,
      description: `SMS (${kind}) → ${phone}`,
    });
    if (claimErr) {
      // 23505 = unique violation → өөр процесс аль хэдийн илгээсэн
      if (claimErr.code === "23505") {
        console.info(`[sms skipped: already sent] order=${orderId} kind=${kind}`);
      } else {
        console.error("[sms claim insert failed]", claimErr);
      }
      return;
    }

    const text = buildText(kind, order);
    const result = await sendSms({ to: phone, text });

    // Илгээсний дараа message_id-г нөхөж бичнэ (мөрдөх, тооцоо хийхэд)
    await admin
      .from("order_events")
      .update({ description: `SMS (${kind}) → ${phone} [${result.message_id}]` })
      .eq("order_id", orderId)
      .eq("event_type", eventType);
  } catch (e) {
    console.error(`[sms send failed] order=${orderId} kind=${kind}`, e);
  }
}
