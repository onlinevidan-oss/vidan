/**
 * Захиалгын SMS мэдэгдэл (best-effort)
 *  · Хэрэглэгчид ЗӨВХӨН гурван тохиолдолд SMS явна:
 *      paid      — төлбөр баталгаажсан (захиалга бүрт нэг удаа)
 *      cancelled — захиалга цуцлагдсан
 *      unpaid    — төлбөр хүлээгдэж байна (нэг удаагийн сануулга)
 *    Хүргэлтийн явцыг (бэлтгэж байна / хүргэлтэд / хүргэгдсэн) захиалгын
 *    хуудсан дээрх "Захиалгын явц" хэсэг real-time харуулна — SMS явуулахгүй.
 *  · SMS амжилтгүй болох нь гол урсгалыг ХЭЗЭЭ Ч тасалдуулахгүй — алдааг log хийгээд өнгөрнө.
 *  · Илгээсэн SMS бүрийг order_events-д тэмдэглэнэ.
 *  · Үүнээс тусдаа АДМИНД шинэ захиалгын мэдэгдэл явна (sendAdminOrderSms).
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms, normalizePhone } from "./client";
import { parseRecipients } from "./recipients";
import {
  SMS_SETTINGS_DEFAULTS,
  type SmsSettings,
} from "@/lib/queries/settings";

export type SmsKind = "paid" | "cancelled" | "unpaid";

/**
 * Загварт орлуулах утгууд — админы тохиргоотой ижил байх ёстой:
 *   {order} — захиалгын дугаар, {total} — нийт дүн
 *   {left}  — нөөц барих үлдсэн хугацаа (зөвхөн unpaid)
 *   {link}  — төлбөрийн хуудасны холбоос (зөвхөн unpaid)
 *   {phone} — захиалагчийн утас (зөвхөн админы мэдэгдэл)
 */
export function renderSmsTemplate(
  template: string,
  order: { order_number: string; total: number },
  extra: { left?: string; link?: string; phone?: string } = {},
): string {
  return template
    .replaceAll("{order}", order.order_number)
    .replaceAll("{total}", `${Number(order.total).toLocaleString("en-US")}₮`)
    .replaceAll("{left}", extra.left ?? "")
    .replaceAll("{link}", extra.link ?? "")
    .replaceAll("{phone}", extra.phone ?? "");
}

/**
 * Захиалгын эзэнд SMS илгээнэ (best-effort — алдаа шидэхгүй).
 * Амжилттай илгээвэл order_events-д sms_sent event нэмнэ.
 */
export async function sendOrderSms(
  orderId: string,
  kind: SmsKind,
  extra: { left?: string; link?: string } = {},
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

    // Админы тохиргоо — унтраасан бол огт илгээхгүй
    const { data: cfgRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();
    const cfg = {
      ...SMS_SETTINGS_DEFAULTS,
      ...((cfgRow?.value ?? {}) as Partial<SmsSettings>),
    };

    const enabled =
      kind === "paid"
        ? cfg.paid_enabled
        : kind === "cancelled"
          ? cfg.cancelled_enabled
          : cfg.unpaid_enabled;
    if (!enabled) {
      console.info(`[sms disabled by admin] order=${orderId} kind=${kind}`);
      return;
    }

    const template =
      kind === "paid"
        ? cfg.paid_template
        : kind === "cancelled"
          ? cfg.cancelled_template
          : cfg.unpaid_template;
    if (!template.trim()) return;

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

    const text = renderSmsTemplate(template, order, extra);
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

/**
 * Шинэ захиалга орж ирснийг АДМИНЫ утаснууд руу мэдэгдэнэ (best-effort).
 * Төлбөр баталгаажсан даруйд дуудагдана — төлөгдөөгүй захиалга 120 минутад
 * өөрөө цуцлагддаг тул тэдгээрт мэдэгдэл явуулахгүй.
 *
 * Нэг захиалгад нэг л удаа: sendOrderSms-тэй адил илгээхийн ӨМНӨ
 * order_events-д тэмдэглэнэ (0041-ийн unique index).
 */
export async function sendAdminOrderSms(orderId: string): Promise<void> {
  try {
    if (!process.env.SMS_API_KEY || !process.env.SMS_FROM_NUMBER) return;

    const admin = createAdminClient();
    const { data: cfgRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "sms_settings")
      .maybeSingle();
    const cfg = {
      ...SMS_SETTINGS_DEFAULTS,
      ...((cfgRow?.value ?? {}) as Partial<SmsSettings>),
    };
    if (!cfg.admin_enabled || !cfg.admin_template.trim()) return;

    const phones = parseRecipients(cfg.admin_phones).valid;
    if (phones.length === 0) return;

    const { data: order } = await admin
      .from("orders")
      .select("order_number, total, contact_phone, profiles:user_id(phone)")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const eventType = "sms_admin";
    const { error: claimErr } = await admin.from("order_events").insert({
      order_id: orderId,
      event_type: eventType,
      description: `Админд SMS → ${phones.join(", ")}`,
    });
    if (claimErr) {
      if (claimErr.code !== "23505") {
        console.error("[admin sms claim insert failed]", claimErr);
      }
      return;
    }

    const profile = Array.isArray(order.profiles)
      ? order.profiles[0]
      : order.profiles;
    const text = renderSmsTemplate(cfg.admin_template, order, {
      phone:
        normalizePhone(order.contact_phone) ||
        normalizePhone(profile?.phone) ||
        "",
    });

    // Нэг дугаар унасан ч нөгөөд нь очно
    const results = await Promise.allSettled(
      phones.map((to) => sendSms({ to, text })),
    );
    const summary = results
      .map((r, i) =>
        r.status === "fulfilled"
          ? `${phones[i]} ✓`
          : `${phones[i]} ✗ ${String(r.reason?.message ?? r.reason).slice(0, 80)}`,
      )
      .join(", ");

    // Production дээр оношлох боломжтой байлгахын тулд үр дүнг үлдээнэ
    await admin
      .from("order_events")
      .update({ description: `Админд SMS → ${summary}` })
      .eq("order_id", orderId)
      .eq("event_type", eventType);
  } catch (e) {
    console.error(`[admin sms failed] order=${orderId}`, e);
  }
}
