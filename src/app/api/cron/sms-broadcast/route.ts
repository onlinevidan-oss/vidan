/**
 * Масс SMS — хуваарьт илгээлт (0047). pg_cron 5 минут тутам дуудна.
 *
 * Цаг нь болсон илгээлтийг бүртгэлтэй бүх дугаар руу явуулна. Дугаар
 * бүрийг илгээхээс ӨМНӨ sms_broadcast_log-д (unique) бичиж авдаг тул
 * cron давхар ажилласан, эсвэл дундаа тасарсан ч нэг хүнд нэг л удаа
 * очно — дараагийн дуудалт үлдсэнийг нь үргэлжлүүлнэ.
 *
 * Хамгаалалт: payment-reminder-тэй ижил — CRON_SECRET заавал.
 * Шөнө (22:00–08:00, УБ) илгээхгүй. 3 цагаас дээш хоцорсон илгээлтийг
 * (жнь. систем унтарч байсан) явуулахгүй, цуцалсан гэж тэмдэглэнэ —
 * буруу цагт сурталчилгаа очихоос сэргийлнэ.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/client";
import { broadcastRecipients } from "@/lib/sms/recipients";
import { ubHour } from "@/lib/order-hold";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUIET_START = 22;
const QUIET_END = 8;
const STALE_MS = 3 * 60 * 60 * 1000;
/** Нэг дуудалтад илгээх дээд тоо — үлдсэнийг дараагийн дуудалт */
const BATCH = 150;
const CONCURRENCY = 5;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET тохируулаагүй" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 401 });
  }

  const nowHour = ubHour(new Date());
  if (nowHour >= QUIET_START || nowHour < QUIET_END) {
    return NextResponse.json({ ok: true, skipped: "шөнийн чимээгүй цаг" });
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: due, error: dueErr } = await admin
    .from("sms_broadcasts")
    .select("id, text, send_at, status")
    .in("status", ["scheduled", "sending"])
    .lte("send_at", new Date(now).toISOString())
    .order("send_at")
    .limit(1);
  if (dueErr) return NextResponse.json({ error: dueErr.message }, { status: 500 });
  const b = due?.[0];
  if (!b) return NextResponse.json({ ok: true, skipped: "хүлээгдэж буй илгээлт алга" });

  if (b.status === "scheduled" && now - Date.parse(b.send_at) > STALE_MS) {
    await admin
      .from("sms_broadcasts")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", b.id)
      .eq("status", "scheduled");
    return NextResponse.json({ ok: true, skipped: "хоцорсон тул цуцлав", id: b.id });
  }

  // Хүлээн авагчид — бүртгэлтэй утас, ажилтнаас бусад
  const [profiles, { data: staff }] = await Promise.all([
    allProfiles(admin),
    admin.from("staff").select("id"),
  ]);
  const phones = broadcastRecipients(profiles, new Set((staff ?? []).map((s) => s.id)));

  if (b.status === "scheduled") {
    const { data: claimed } = await admin
      .from("sms_broadcasts")
      .update({ status: "sending", started_at: new Date().toISOString(), recipients: phones.length })
      .eq("id", b.id)
      .eq("status", "scheduled")
      .select("id");
    // Өөр дуудалт эхлүүлсэн — тэр нь үргэлжлүүлнэ
    if (!claimed?.length) return NextResponse.json({ ok: true, skipped: "өөр дуудалт эхлүүлсэн" });
  }

  const { data: done } = await admin
    .from("sms_broadcast_log")
    .select("phone")
    .eq("broadcast_id", b.id);
  const already = new Set((done ?? []).map((d) => d.phone));
  const todo = phones.filter((p) => !already.has(p)).slice(0, BATCH);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map(async (phone) => {
        // Илгээхээс өмнө мөрөө авна — давхардлаас хамгаална
        const { error: claimErr } = await admin
          .from("sms_broadcast_log")
          .insert({ broadcast_id: b.id, phone });
        if (claimErr) return;
        try {
          await sendSms({ to: phone, text: b.text });
          await admin.from("sms_broadcast_log").update({ ok: true })
            .eq("broadcast_id", b.id).eq("phone", phone);
          sent++;
        } catch (e) {
          await admin.from("sms_broadcast_log")
            .update({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) })
            .eq("broadcast_id", b.id).eq("phone", phone);
          failed++;
        }
      }),
    );
  }

  // Нийт тоог логоос дахин тоолно — олон дуудалтад хуваагдсан ч зөв
  const [{ count: okCount }, { count: failCount }, { count: total }] = await Promise.all([
    admin.from("sms_broadcast_log").select("phone", { count: "exact", head: true }).eq("broadcast_id", b.id).eq("ok", true),
    admin.from("sms_broadcast_log").select("phone", { count: "exact", head: true }).eq("broadcast_id", b.id).eq("ok", false),
    admin.from("sms_broadcast_log").select("phone", { count: "exact", head: true }).eq("broadcast_id", b.id),
  ]);
  const finished = (total ?? 0) >= phones.length;
  await admin
    .from("sms_broadcasts")
    .update({
      sent: okCount ?? 0,
      failed: failCount ?? 0,
      ...(finished ? { status: "sent", finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", b.id);

  return NextResponse.json({ ok: true, id: b.id, sent, failed, finished, recipients: phones.length });
}

/** profiles-ийг бүгдийг нь (1000-аар) — Supabase нэг удаад 1000 буцаадаг */
async function allProfiles(admin: ReturnType<typeof createAdminClient>) {
  const out: { id: string; phone: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from("profiles").select("id, phone").range(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
