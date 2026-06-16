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
  checkPayment,
  createEbarimt,
  type QpayBankUrl,
} from "./client";
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

  const invoice = await createInvoice({
    senderInvoiceNo: senderInvoiceNo || order.id.slice(0, 12),
    amount: order.total,
    description: `VIDAN захиалга ${order.order_number}`,
    callbackUrl: `${baseUrl}/api/qpay/callback?order_id=${order.id}`,
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

  // E-barimt — best effort, гол урсгалыг тасалдуулахгүй.
  if (paymentId) {
    try {
      await createEbarimt(paymentId, "CITIZEN");
    } catch {
      // E-barimt амжилтгүй болсон нь төлбөрийг хүчингүй болгохгүй.
    }
  }

  return "paid";
}

export type { QpayBankUrl };
