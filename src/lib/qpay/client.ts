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
import type { QpayInvoiceLine } from "./ebarimt-lines";

const QPAY_BASE_URL = process.env.QPAY_BASE_URL ?? "https://merchant.qpay.mn/v2";

/**
 * QPay-д хоёр тусдаа эрх бий:
 *  · "default"  — энгийн нэхэмжлэх (и-баримтгүй)
 *  · "ebarimt"  — и-баримт үүсгэдэг нэхэмжлэх. QPay 2026-09-11-нд тусдаа
 *                 client/password/invoice code өгсөн. Тусад нь token авна.
 */
export type QpayAccount = "default" | "ebarimt";

/**
 * Token cache хоёр төрөлтэй:
 *  · default — qpay_tokens хүснэгтэд (id=1). Хүснэгт дээр `id = 1` гэсэн
 *    check constraint байгаа тул өөр мөр нэмэх боломжгүй.
 *  · ebarimt — процессын дотор. Serverless instance тус бүр өөрийн
 *    cache-тэй байх нь хэвийн: token авах нь хямд, харин хүсэлт бүрд
 *    авах нь илүүц. (GA4 клиент ч ижил зарчимтай.)
 */
let ebarimtToken: { token: string; expiresAtMs: number } | null = null;

function getConfig(account: QpayAccount = "default") {
  const [u, p, c] =
    account === "ebarimt"
      ? ["QPAY_EB_USERNAME", "QPAY_EB_PASSWORD", "QPAY_EB_INVOICE_CODE"]
      : ["QPAY_USERNAME", "QPAY_PASSWORD", "QPAY_INVOICE_CODE"];
  const username = process.env[u];
  const password = process.env[p];
  const invoiceCode = process.env[c];
  if (!username || !password || !invoiceCode) {
    throw new Error(`QPay тохиргоо дутуу: ${u}, ${p}, ${c} шаардлагатай`);
  }
  return { username, password, invoiceCode };
}

/** И-баримттай нэхэмжлэх идэвхтэй эсэх */
export function isEbarimtEnabled(): boolean {
  if (process.env.EBARIMT_ENABLED?.trim() !== "true") return false;
  return !!(
    process.env.QPAY_EB_USERNAME &&
    process.env.QPAY_EB_PASSWORD &&
    process.env.QPAY_EB_INVOICE_CODE
  );
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

/** /ebarimt_v3/create-ийн хариу (хэрэгтэй талбарууд) */
export type QpayEbarimtResponse = {
  id: string;
  ebarimt_lottery?: string | null;
  ebarimt_qr_data?: string | null;
  ebarimt_status?: string;
  ebarimt_status_date?: string | null;
  amount?: number;
  vat_amount?: number;
  city_tax_amount?: number;
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

async function fetchNewToken(
  account: QpayAccount = "default",
): Promise<{ token: string; expiresAtIso: string }> {
  const { username, password } = getConfig(account);
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

  if (account === "ebarimt") {
    ebarimtToken = {
      token: data.access_token,
      expiresAtMs: expiresAtSec * 1000,
    };
  } else {
    // DB-д cache хийх (service role — RLS bypass)
    const admin = createAdminClient();
    await admin.from("qpay_tokens").upsert({
      id: 1,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    });
  }

  return { token: data.access_token, expiresAtIso };
}

export async function getAccessToken(
  account: QpayAccount = "default",
): Promise<string> {
  if (account === "ebarimt") {
    if (
      ebarimtToken &&
      ebarimtToken.expiresAtMs - EXPIRY_BUFFER_SEC * 1000 > Date.now()
    ) {
      return ebarimtToken.token;
    }
    return (await fetchNewToken("ebarimt")).token;
  }

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

  const { token } = await fetchNewToken(account);
  return token;
}

// Token хүчингүй (401) болсон үед нэг удаа сэргээж дахин оролдоx туслах
async function authedFetch(
  path: string,
  init: RequestInit,
  account: QpayAccount = "default",
): Promise<Response> {
  let token = await getAccessToken(account);
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
    token = (await fetchNewToken(account)).token;
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
// И-баримттай нэхэмжлэх (QPay e-barimt 3.0)
// ============================================================
/**
 * И-баримт үүсгэх боломжтой нэхэмжлэх.
 *
 * ⚠️ Энгийн нэхэмжлэхээс ялгаатай нь `amount` талбар БАЙХГҮЙ — QPay нийт
 *    дүнг `lines`-ээс тооцно. Тиймээс мөрүүдийн нийлбэр захиалгын төлөх
 *    дүнтэй таарч байгааг дуудагч тал заавал шалгана.
 */
export async function createEbarimtInvoice(params: {
  senderInvoiceNo: string;
  description: string;
  callbackUrl: string;
  receiverCode?: string;
  /** Хэрэглэгчийн мэдээлэл — и-баримт нь энэ утас/имэйл рүү очно */
  receiver?: { register?: string; name?: string; email?: string; phone?: string };
  /** 1: НӨАТ тооцогдох · 2: чөлөөлөгдөх · 3: НӨАТ 0 */
  taxType?: "1" | "2" | "3";
  districtCode: string;
  branchCode?: string;
  lines: QpayInvoiceLine[];
}): Promise<QpayInvoiceResponse> {
  const { invoiceCode } = getConfig("ebarimt");
  const res = await authedFetch(
    "/invoice",
    {
      method: "POST",
      body: JSON.stringify({
        invoice_code: invoiceCode,
        sender_invoice_no: params.senderInvoiceNo,
        ...(params.branchCode ? { sender_branch_code: params.branchCode } : {}),
        invoice_receiver_code: params.receiverCode ?? "terminal",
        ...(params.receiver ? { invoice_receiver_data: params.receiver } : {}),
        invoice_description: params.description,
        tax_type: params.taxType ?? "1",
        district_code: params.districtCode,
        callback_url: params.callbackUrl,
        lines: params.lines,
      }),
    },
    "ebarimt",
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `QPay и-баримттай нэхэмжлэх үүсгэж чадсангүй (${res.status}): ${body}`,
    );
  }
  return (await res.json()) as QpayInvoiceResponse;
}

// ============================================================
// E-Barimt үүсгэх (best-effort, төлбөр баталгаажсаны дараа)
// ============================================================
/**
 * Төлбөр төлөгдсөний дараа и-баримт бүртгүүлнэ.
 * Сугалааны дугаар, QR нь энэ хариунаас ирнэ.
 */
export async function createEbarimtReceipt(
  qpayPaymentId: string,
  opts: {
    receiverType?: "CITIZEN" | "COMPANY";
    /** Иргэн бол и-баримтад бүртгэлтэй утас, ААН бол регистр */
    receiver?: string | null;
  } = {},
): Promise<QpayEbarimtResponse> {
  const res = await authedFetch(
    "/ebarimt_v3/create",
    {
      method: "POST",
      body: JSON.stringify({
        payment_id: qpayPaymentId,
        ebarimt_receiver_type: opts.receiverType ?? "CITIZEN",
        ...(opts.receiver ? { ebarimt_receiver: opts.receiver } : {}),
      }),
    },
    "ebarimt",
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QPay e-barimt үүсгэж чадсангүй (${res.status}): ${body}`);
  }
  return (await res.json()) as QpayEbarimtResponse;
}
