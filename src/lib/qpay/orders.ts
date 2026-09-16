/**
 * QPay ↔ Order холбох серверийн логик (admin client ашиглана).
 *  · ensureInvoiceForOrder — захиалгад qPay нэхэмжлэл байхгүй бол үүсгэнэ (idempotent)
 *  · verifyAndMarkPaid     — /payment/check-ээр баталгаажуулж, төлөгдсөн бол paid болгоно
 */
import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInvoice,
  createEbarimtInvoice,
  checkPayment,
  isEbarimtEnabled,
  type QpayBankUrl,
} from "./client";
import {
  buildOrderEbarimtLines,
  createOrderEbarimtViaQpay,
  getDistrictCode,
} from "./ebarimt";
import { createOrderEbarimt } from "@/lib/ebarimt/orders";
import { sendOrderSms } from "@/lib/sms/notifications";
import { sendPurchaseEvent } from "@/lib/ga4-mp";
import type { Database } from "@/lib/supabase/database.types";

export type QpayInvoiceRow =
  Database["public"]["Tables"]["qpay_invoices"]["Row"];

/** Callback болон богино холбоосны суурь URL */
async function getBaseUrl(): Promise<string> {
  const fromEnv = process.env.QPAY_CALLBACK_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Орчны хувьсагч байхгүй бол хүсэлтийн host-оос гаргана.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Захиалгад qPay нэхэмжлэл байгаа эсэхийг шалгаад байхгүй бол үүсгэнэ.
 * Үр дүн нь qpay_invoices мөр.
 */
export async function ensureInvoiceForOrder(order: {
  id: string;
  order_number: string;
  total: number;
}): Promise<QpayInvoiceRow> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("qpay_invoices")
    .select("*")
    .eq("order_id", order.id)
    .maybeSingle();

  if (existing) return existing;

  const baseUrl = await getBaseUrl();
  const senderInvoiceNo = order.order_number.replace(/[^0-9A-Za-z]/g, "");

  const invoiceNo = senderInvoiceNo || order.id.slice(0, 12);
  const description = `VIDAN захиалга ${order.order_number}`;
  const callbackUrl = `${baseUrl}/api/qpay/callback?order_id=${order.id}`;

  const invoice = await createOrderInvoice(order, {
    invoiceNo,
    description,
    callbackUrl,
  });

  const { data: row, error } = await admin
    .from("qpay_invoices")
    .insert({
      order_id: order.id,
      invoice_id: invoice.invoice_id,
      qr_text: invoice.qr_text,
      qr_image: invoice.qr_image,
      qpay_short_url: invoice.qPay_shortUrl ?? null,
      urls: (invoice.urls ?? []) as unknown as Database["public"]["Tables"]["qpay_invoices"]["Insert"]["urls"],
      amount: order.total,
      status: "pending",
    })
    .select("*")
    .single();

  // Давхар insert (race condition) — байгаа record-ийг буцаана
  if (error?.code === "23505") {
    const { data: existing2 } = await admin
      .from("qpay_invoices")
      .select("*")
      .eq("order_id", order.id)
      .maybeSingle();
    if (existing2) return existing2;
  }

  if (error || !row) {
    throw new Error(`qPay нэхэмжлэл хадгалж чадсангүй: ${error?.message}`);
  }
  return row;
}

/**
 * Нэхэмжлэхийг үүсгэнэ — и-баримт идэвхтэй бол мөр задалсан хувилбараар.
 *
 * ⚠️ Мөрүүдийн нийлбэр захиалгын дүнтэй таарахгүй бол и-баримттай
 *    нэхэмжлэх рүү ОРОХГҮЙ: QPay нийт дүнг мөрүүдээс тооцдог тул
 *    хэрэглэгч буруу дүн төлөх эрсдэлтэй. Энгийн нэхэмжлэх рүү шилжинэ.
 */
async function createOrderInvoice(
  order: { id: string; order_number: string; total: number },
  p: { invoiceNo: string; description: string; callbackUrl: string },
) {
  if (isEbarimtEnabled()) {
    try {
      const built = await buildOrderEbarimtLines(order.id);
      if (built?.matchesOrderTotal) {
        // И-баримт нь эдгээр холбоо барих мэдээллээр хэрэглэгчид очно.
        // Имэйл захиалга дээр байдаггүй тул профайлаас авна.
        const admin = createAdminClient();
        const { data: o } = await admin
          .from("orders")
          .select("contact_phone, user:profiles(email, full_name)")
          .eq("id", order.id)
          .maybeSingle();
        const profile = Array.isArray(o?.user) ? o?.user[0] : o?.user;

        return await createEbarimtInvoice({
          senderInvoiceNo: p.invoiceNo,
          description: p.description,
          callbackUrl: p.callbackUrl,
          districtCode: getDistrictCode(),
          branchCode: process.env.QPAY_EB_BRANCH_CODE?.trim() || undefined,
          receiver: {
            ...(o?.contact_phone ? { phone: o.contact_phone } : {}),
            ...(profile?.email ? { email: profile.email } : {}),
            ...(profile?.full_name ? { name: profile.full_name } : {}),
          },
          lines: built.lines,
        });
      }
      console.error(
        `[ebarimt] мөр таарахгүй тул энгийн нэхэмжлэх рүү шилжлээ order=${order.id}`,
      );
    } catch (e) {
      // И-баримтын алдаа худалдан авалтыг зогсоож болохгүй — энгийн рүү шилжинэ
      console.error(`[ebarimt invoice failed] order=${order.id}`, e);
    }
  }

  return createInvoice({
    senderInvoiceNo: p.invoiceNo,
    amount: order.total,
    description: p.description,
    callbackUrl: p.callbackUrl,
  });
}

export type PaidStatus = "paid" | "pending" | "not_found";

/**
 * Захиалгын төлбөрийг qPay-ээс шалгаж, төлөгдсөн бол paid болгоно.
 * callback болон polling хоёулаа дуудна (idempotent).
 */
export async function verifyAndMarkPaid(orderId: string): Promise<PaidStatus> {
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("qpay_invoices")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!inv) return "not_found";
  if (inv.status === "paid") return "paid";

  const result = await checkPayment(inv.invoice_id);
  const isPaid = result.count > 0 && result.paid_amount >= Number(inv.amount);

  if (!isPaid) return "pending";

  const paymentId = result.rows[0]?.payment_id ?? null;

  const { error } = await admin.rpc("mark_order_paid", {
    p_order_id: orderId,
    p_payment_ref: paymentId,
    p_qpay_payment_id: paymentId,
  });
  if (error) {
    throw new Error(`Төлбөр баталгаажуулахад алдаа: ${error.message}`);
  }

  // E-barimt — best effort, idempotent (гол урсгалыг тасалдуулахгүй).
  // QPay-ийн и-баримт идэвхтэй бол түүгээр, эс бөгөөс PosAPI-аар.
  if (isEbarimtEnabled()) {
    await createOrderEbarimtViaQpay(orderId, paymentId);
  } else {
    await createOrderEbarimt(orderId);
  }

  // Хэрэглэгчид баталгаажилтын SMS — best effort.
  await sendOrderSms(orderId, "paid");

  // GA4-д сервер талаас худалдан авалт бүртгэх — банкны апп-аас буцаж
  // ирээгүй хүн ч тоологдоно. Хэмжилт борлуулалтыг тасалдуулж болохгүй.
  await sendPurchaseEvent(orderId);

  return "paid";
}

export type { QpayBankUrl };
