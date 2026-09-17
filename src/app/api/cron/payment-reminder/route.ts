/**
 * Төлөгдөөгүй захиалгын сануулга SMS — Vercel Cron-оор 10 минут тутам.
 *
 * ХЭМЖИЛТ (2026-09-16): QR хуудсанд хүрсэн 38 захиалга төлөгдөөгүй
 * үлдсэн, нийт 3,171,364₮. Нэг ч сануулга явуулаагүй байв. Захиалагч
 * бүр SMS кодоор нэвтэрсэн тул утасны дугаар нь бидэнд бий.
 *
 * ЦАГИЙН ХҮРЭЭ: захиалга үүссэнээс `unpaid_after_minutes` (өгөгдмөл 25)
 * минутын дараа нэг л удаа явна.
 *
 * ШӨНӨ ИЛГЭЭХГҮЙ: UB цагаар 22:00–08:00 хооронд SMS явуулахгүй. Шөнө
 * дунд утас дуугарах нь тустай биш. Шөнө өгсөн захиалга өглөөний
 * 09:00 хүртэл амьд байдаг (0039) тул сануулга 08:00-д очиход
 * төлөх цаг бий — үнэндээ шөнө дунд илгээснээс хавьгүй үр дүнтэй.
 *
 * Хамгаалалт: Vercel-ийн cron нь `Authorization: Bearer $CRON_SECRET`
 * толгойг явуулдаг. CRON_SECRET тохируулаагүй бол зам ажиллахгүй —
 * задгай үлдээвэл хэн ч SMS илгээлгэх боломжтой болно.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderSms } from "@/lib/sms/notifications";
import {
  SMS_SETTINGS_DEFAULTS,
  type SmsSettings,
} from "@/lib/queries/settings";
import { orderExpiresAt, HOLD_MINUTES, ubHour } from "@/lib/order-hold";

export const dynamic = "force-dynamic";

/** UB цагаар SMS илгээхгүй цонх — [эхлэл, төгсгөл) */
const SMS_QUIET_START_HOUR = 22;
const SMS_QUIET_END_HOUR = 8;

function formatLeft(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} цаг ${m} минут` : `${h} цаг`;
  }
  return `${minutes} минут`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET тохируулаагүй" },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: cfgRow } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "sms_settings")
    .maybeSingle();
  const cfg: SmsSettings = {
    ...SMS_SETTINGS_DEFAULTS,
    ...((cfgRow?.value ?? {}) as Partial<SmsSettings>),
  };

  if (!cfg.unpaid_enabled) {
    return NextResponse.json({ ok: true, skipped: "сануулга унтраалттай" });
  }

  // Шөнө хүний утсыг дуугаргахгүй
  const nowHour = ubHour(new Date());
  if (nowHour >= SMS_QUIET_START_HOUR || nowHour < SMS_QUIET_END_HOUR) {
    return NextResponse.json({ ok: true, skipped: "шөнийн чимээгүй цаг" });
  }

  const after = Math.min(Math.max(cfg.unpaid_after_minutes, 5), HOLD_MINUTES - 5);
  const now = Date.now();
  const readyBefore = new Date(now - after * 60_000).toISOString();

  const { data: orders, error } = await admin
    .from("orders")
    .select("id, order_number, created_at")
    .eq("payment_status", "pending")
    .neq("status", "cancelled")
    .lte("created_at", readyBefore);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const base = (
    process.env.QPAY_CALLBACK_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://vidan.mn"
  ).replace(/\/$/, "");

  // Давхар илгээхээс order_events дээрх unique index (0036) хамгаална,
  // тул энд зөвхөн дуудна — sendOrderSms өөрөө шүүнэ.
  let sent = 0;
  let expired = 0;
  for (const o of orders ?? []) {
    // Үлдсэн хугацааг `order-hold.ts` бодно — шөнийн цагт захиалга
    // цуцлагддаггүй тул 23:00-ны захиалгад "5 минут үлдлээ" гэж
    // худал хэлэхгүй, өглөө хүртэлх бодит хугацааг хэлнэ.
    const left = Math.floor(
      (orderExpiresAt(new Date(o.created_at)).getTime() - now) / 60_000,
    );
    // Цуцлагдах гэж буй захиалгад "төлнө үү" гэж хэлэх нь утгагүй.
    if (left < 10) {
      expired++;
      continue;
    }
    // Богино холбоос (/t/10281) — UUID-тай бүтэн зам SMS-ийг нэг
    // segment-ээр уртасгадаг тул төлбөр нэмэгдэнэ.
    const code = o.order_number.replace(/\D/g, "");
    await sendOrderSms(o.id, "unpaid", {
      left: formatLeft(left),
      link: `${base}/t/${code}`,
    });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    candidates: orders?.length ?? 0,
    sent,
    skippedExpiring: expired,
  });
}
