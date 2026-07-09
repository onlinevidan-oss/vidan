/**
 * Supabase Auth "Send SMS" hook
 *  Supabase Auth OTP илгээх бүрт энэ endpoint-ийг дуудаж, бид CallPro Text-ээр
 *  SMS-ийг өөрсдөө илгээнэ (Twilio г.м. гадаад provider шаардлагагүй).
 *
 *  Аюулгүй байдал: Supabase хүсэлтээ Standard Webhooks спекээр гарын үсэглэдэг.
 *  (headers: webhook-id, webhook-timestamp, webhook-signature)
 *  SEND_SMS_HOOK_SECRET — "v1,whsec_<base64>" хэлбэртэй hook secret.
 */
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { sendSms, normalizePhone } from "@/lib/sms/client";

export const dynamic = "force-dynamic";

const TIMESTAMP_TOLERANCE_SEC = 5 * 60; // replay-аас хамгаалах цонх

function getSecretBytes(): Buffer | null {
  // Дэмжих форматууд: "v1,whsec_<b64>", "whsec_<b64>", "<b64>"
  const raw = process.env.SEND_SMS_HOOK_SECRET;
  if (!raw) return null;
  const b64 = raw.replace(/^v1,/, "").replace(/^whsec_/, "");
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function verifySignature(
  secret: Buffer,
  msgId: string,
  timestamp: string,
  payload: string,
  signatureHeader: string,
): boolean {
  const signedContent = `${msgId}.${timestamp}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header нь "v1,<sig>" хэлбэрийн, зайгаар тусгаарлагдсан олон утга байж болно.
  return signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",", 2);
    if (version !== "v1" || !sig) return false;
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

type SendSmsHookPayload = {
  user?: { phone?: string };
  sms?: { otp?: string };
};

export async function POST(request: NextRequest) {
  const secret = getSecretBytes();
  if (!secret) {
    return NextResponse.json(
      { error: "SEND_SMS_HOOK_SECRET тохируулаагүй" },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const msgId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");

  if (!msgId || !timestamp || !signature) {
    return NextResponse.json({ error: "Гарын үсэг дутуу" }, { status: 401 });
  }

  const tsSec = Number(timestamp);
  if (
    !Number.isFinite(tsSec) ||
    Math.abs(Date.now() / 1000 - tsSec) > TIMESTAMP_TOLERANCE_SEC
  ) {
    return NextResponse.json({ error: "Хугацаа хэтэрсэн" }, { status: 401 });
  }

  if (!verifySignature(secret, msgId, timestamp, payload, signature)) {
    return NextResponse.json({ error: "Гарын үсэг буруу" }, { status: 401 });
  }

  let body: SendSmsHookPayload;
  try {
    body = JSON.parse(payload) as SendSmsHookPayload;
  } catch {
    return NextResponse.json({ error: "JSON буруу" }, { status: 400 });
  }

  const phone = normalizePhone(body.user?.phone);
  const otp = body.sms?.otp;
  if (!phone || !otp) {
    return NextResponse.json(
      { error: "Утас эсвэл OTP дутуу" },
      { status: 400 },
    );
  }

  try {
    await sendSms({ to: phone, text: `VIDAN нэвтрэх код: ${otp}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "SMS алдаа";
    console.error("[sms-hook send failed]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Supabase 200 + хоосон JSON хүлээнэ.
  return NextResponse.json({});
}
