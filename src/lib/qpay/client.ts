/**
 * QPay v2 merchant API client (server-only)
 * ДӨРВӨН-ӨЛЗИЙ ХХК — VIDAN
 *
 * Гол зарчим:
 *  · Access token-ийг DB-д cache хийж, хүчинтэй хугацаанд НЭГ Л УДАА авна.
 *    (qPay-ийн заавар: token-ийг timestamp-аар нэг л удаа авах)
 *  · Төлбөр төлөгдсөн эсэхийг callback хүлээж аваад /payment/check-ээр баталгаажуулна.
 *
 * ⚠️ Энэ модулийг зөвхөн серверт (server action, route handler) импортолно.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL ?? "https://merchant.qpay.mn/v2";

function getConfig() {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  const invoiceCode = process.env.QPAY_INVOICE_CODE;
  if (!username || !password || !invoiceCode) {
    throw new Error(
      "QPay тохиргоо дутуу: QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE шаардлагатай",
    );
  }
  return { username, password, invoiceCode };
}

// ============================================================
// Types
// ============================================================
type QpayTokenResponse = {
  token_type: string;
  refresh_expires_in: number;
  refresh_token: string;
  access_token: string;
  expires_in: number; // qPay-д unix epoch (сек) хэлбэрээр ирдэг
};

export type QpayBankUrl = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

export type QpayInvoiceResponse = {
  invoice_id: string;
  qr_text: string;
  qr_image: string; // base64 PNG (data URI-гүй)
  qPay_shortUrl?: string;
  urls: QpayBankUrl[];
};

export type QpayCheckRow = {
  payment_id: string;
  payment_status: string;
  payment_amount: string;
  payment_date?: string;
};

export type QpayCheckResponse = {
  count: number;
  paid_amount: number;
  rows: QpayCheckRow[];
};

// ============================================================
// Access token — DB cache (singleton row id=1)
// ============================================================
const EXPIRY_BUFFER_SEC = 60; // дуусахаас 60 сек өмнө сэргээнэ

async function fetchNewToken(): Promise<{ token: string; expiresAtIso: string }> {
  const { username, password } = getConfig();
  const basic = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(`${QPAY_BASE_URL}/auth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QPay token авч чадсангүй (${res.status}): ${body}`);
  }

  const data = (await res.json()) as QpayTokenResponse;
  const nowSec = Math.floor(Date.now() / 1000);
  // qPay-ийн expires_in нь unix timestamp (epoch). Хэрэв одоогийнхоос их бол epoch,
  // эс бөгөөс хугацааны үргэлжлэл (сек) гэж үзнэ.
  const expiresAtSec =
    data.expires_in > nowSec ? data.expires_in : nowSec + data.expires_in;
  const expiresAtIso = new Date(expiresAtSec * 1000).toISOString();

  // DB-д cache хийх (service role — RLS bypass)
  const admin = createAdminClient();
  await admin.from("qpay_tokens").upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAtIso,
    updated_at: new Date().toISOString(),
  });

  return { token: data.access_token, expiresAtIso };
}

export async function getAccessToken(): Promise<string> {
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("qpay_tokens")
    .select("access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();

  if (cached?.access_token && cached.expires_at) {
    const expiresMs = new Date(cached.expires_at).getTime();
    if (expiresMs - EXPIRY_BUFFER_SEC * 1000 > Date.now()) {
      // Хүчинтэй хугацаанд байгаа — дахин авахгүй.
      return cached.access_token;
    }
  }

  const { token } = await fetchNewToken();
  return token;
}

// Token хүчингүй (401) болсон үед нэг удаа сэргээж дахин оролдоx туслах
async function authedFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  let token = await getAccessToken();
  const doFetch = (t: string) =>
    fetch(`${QPAY_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    // Cache-д байсан token хүчингүй болсон байж магадгүй — шинээр аваад дахин оролдоно.
    token = (await fetchNewToken()).token;
    res = await doFetch(token);
  }
  return res;
}

// ============================================================
// Invoice үүсгэх
// ============================================================
export async function createInvoice(params: {
  senderInvoiceNo: string;
  amount: number;
  description: string;
  callbackUrl: string;
  receiverCode?: string;
}): Promise<QpayInvoiceResponse> {
  const { invoiceCode } = getConfig();
  const res = await authedFetch("/invoice", {
    method: "POST",
    body: JSON.stringify({
      invoice_code: invoiceCode,
      sender_invoice_no: params.senderInvoiceNo,
      invoice_receiver_code: params.receiverCode ?? "terminal",
      invoice_description: params.description,
      amount: params.amount,
      callback_url: params.callbackUrl,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QPay invoice үүсгэж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as QpayInvoiceResponse;
}

// ============================================================
// Төлбөр шалгах (INVOICE-аар)
// ============================================================
export async function checkPayment(
  invoiceId: string,
): Promise<QpayCheckResponse> {
  const res = await authedFetch("/payment/check", {
    method: "POST",
    body: JSON.stringify({
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QPay төлбөр шалгаж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as QpayCheckResponse;
}

// ============================================================
// Invoice цуцлах
// ============================================================
export async function cancelInvoice(invoiceId: string): Promise<void> {
  const res = await authedFetch(`/invoice/${invoiceId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`QPay invoice цуцалж чадсангүй (${res.status}): ${body}`);
  }
}

// ============================================================
// E-Barimt үүсгэх (best-effort, төлбөр баталгаажсаны дараа)
// ============================================================
export async function createEbarimt(
  qpayPaymentId: string,
  receiverType: "CITIZEN" | "COMPANY" = "CITIZEN",
): Promise<unknown> {
  const res = await authedFetch("/ebarimt/create", {
    method: "POST",
    body: JSON.stringify({
      payment_id: qpayPaymentId,
      ebarimt_receiver_type: receiverType,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QPay e-barimt үүсгэж чадсангүй (${res.status}): ${body}`);
  }
  return res.json();
}
