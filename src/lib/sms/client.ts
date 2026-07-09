/**
 * CallPro Text SMS API client (server-only)
 * ДӨРВӨН-ӨЛЗИЙ ХХК — VIDAN
 *
 * Гол зарчим:
 *  · x-api-key header-ээр нэвтэрнэ.
 *  · Кирилл мессеж 70 тэмдэгтээс хэтэрвэл олон segment болж илгээгддэг тул
 *    мэдэгдлийн текстийг аль болох богино байлгана.
 *
 * ⚠️ Энэ модулийг зөвхөн серверт (server action, route handler) импортолно.
 */
import "server-only";

const SMS_BASE_URL =
  process.env.SMS_BASE_URL ?? "https://api-text.callpro.mn/v1/sms";

function getConfig() {
  const apiKey = process.env.SMS_API_KEY;
  const from = process.env.SMS_FROM_NUMBER;
  if (!apiKey || !from) {
    throw new Error(
      "SMS тохиргоо дутуу: SMS_API_KEY, SMS_FROM_NUMBER шаардлагатай",
    );
  }
  return { apiKey, from };
}

// ============================================================
// Types
// ============================================================
export type SmsSendResponse = {
  status: string; // "queued"
  message_id: string;
};

export type SmsDeliveryResponse = {
  uniqueId: string;
  messageCount: number;
  delivered: boolean;
  messages: { events: string[] }[]; // QUEUED → DELIVERED / UNDELIVERED
};

export type SmsDailyCountResponse = {
  balance: number;
  current: number;
  total_message: number;
};

/**
 * Утасны дугаарыг API-д тохирох хэлбэрт оруулна.
 * +976/976 prefix-ийг хүлээн зөвшөөрч, монгол 8 оронтой дугаар буцаана.
 * Олон улсын дугаарыг (улсын код + дугаар) байгаагаар нь үлдээнэ.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("976") && digits.length === 11) {
    digits = digits.slice(3);
  }
  if (digits.length === 8 && /^[6-9]/.test(digits)) return digits;
  // Олон улсын формат (улсын код + дугаар)
  if (digits.length > 8) return digits;
  return null;
}

// ============================================================
// SMS илгээх
// ============================================================
export async function sendSms(params: {
  to: string;
  text: string;
}): Promise<SmsSendResponse> {
  const { apiKey, from } = getConfig();

  const res = await fetch(`${SMS_BASE_URL}/send`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: params.to, text: params.text }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMS илгээж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as SmsSendResponse;
}

// ============================================================
// Хүргэлтийн төлөв шалгах
// ============================================================
export async function getDeliveryStatus(
  messageId: string,
): Promise<SmsDeliveryResponse> {
  const { apiKey } = getConfig();

  const res = await fetch(`${SMS_BASE_URL}/${encodeURIComponent(messageId)}`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMS төлөв шалгаж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as SmsDeliveryResponse;
}

// ============================================================
// Өдрийн үлдэгдэл (операторын нэрээр)
// ============================================================
export async function getDailyCount(
  operator: "skytel" | "mobicom" | "unitel",
): Promise<SmsDailyCountResponse> {
  const { apiKey } = getConfig();

  const res = await fetch(
    `${SMS_BASE_URL}/tenant/daily?operator=${operator}`,
    {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SMS үлдэгдэл шалгаж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as SmsDailyCountResponse;
}
