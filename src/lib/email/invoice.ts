/**
 * Байгууллагын нэхэмжлэлийг (0052) захиалагчийн өгсөн имэйл рүү
 * автоматаар илгээнэ — Resend (https://resend.com) REST API.
 *
 * Орчны хувьсагч:
 *   RESEND_API_KEY      — байхгүй бол имэйл илгээхгүй (захиалга тасрахгүй)
 *   EMAIL_FROM          — (заавал биш) анхдагч "VIDAN <nehemjleh@vidan.mn>" (Resend-д баталгаажсан домэйн)
 *   EMAIL_REPLY_TO      — (заавал биш) анхдагч нь нягтлангийн имэйл
 *   INVOICE_EMAIL_BCC   — (заавал биш) хуулбар; анхдагч нь нягтлангийн имэйл
 *                         (эзэн 11-17-нд баталсан). "off" бол хуулбаргүй.
 *
 * order_events.email_invoice-ийн unique индексээр нэг захиалгад нэг л удаа.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureInvoiceForOrder } from "@/lib/qpay/orders";
import { qrDataUrl } from "@/lib/ebarimt/qr";
import { vatBreakdown } from "@/lib/pricing";
import { formatUbDate, formatUbDateTime } from "@/lib/datetime";
import { INVOICE_SELLER, buildInvoiceLines, invoiceNumber } from "@/lib/invoice";
import { invoiceEmailHtml, invoiceEmailSubject, invoiceEmailText } from "@/lib/invoice-email";

const QR_CID = "qpay-qr";

export async function sendInvoiceEmail(orderId: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "VIDAN <nehemjleh@vidan.mn>";
    if (!apiKey) {
      console.warn(`[invoice email] RESEND_API_KEY тохируулаагүй — илгээсэнгүй order=${orderId}`);
      return;
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select(
        `id, order_number, created_at, payment_method, payment_status, status,
         discount, shipping, tax, total, voucher_amount,
         ebarimt_customer_tin, invoice_org_name, invoice_email, invoice_due_at,
         items:order_items(product_name, product_sku, quantity, unit_price, subtotal,
           product:products(classification_code))`,
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.payment_method !== "invoice" || !order.invoice_email) return;
    if (order.payment_status === "paid" || order.status === "cancelled") return;

    const to = order.invoice_email;
    const eventType = "email_invoice";
    const { error: claimErr } = await admin.from("order_events").insert({
      order_id: orderId,
      event_type: eventType,
      description: `Нэхэмжлэх имэйлээр → ${to}`,
    });
    if (claimErr) {
      if (claimErr.code !== "23505") console.error("[invoice email claim failed]", claimErr);
      return;
    }

    const total = Number(order.total);
    const { lines } = buildInvoiceLines({
      discount: Number(order.discount),
      shipping: Number(order.shipping),
      tax: Number(order.tax),
      total,
      voucher_amount: Number(order.voucher_amount ?? 0),
      items: (order.items ?? []).map((i) => {
        const p = Array.isArray(i.product) ? i.product[0] : i.product;
        return {
          product_name: i.product_name,
          code: p?.classification_code ?? i.product_sku ?? null,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
          subtotal: Number(i.subtotal),
        };
      }),
    });
    const vat = vatBreakdown(total);

    // QPay QR — бүтэлгүйтвэл дансны мэдээлэлтэйгээр явуулна
    let qpayUrl: string | null = null;
    let qrBase64: string | null = null;
    try {
      const inv = await ensureInvoiceForOrder({
        id: order.id,
        order_number: order.order_number,
        total,
      });
      qpayUrl = inv.qpay_short_url;
      if (inv.qr_text) qrBase64 = (await qrDataUrl(inv.qr_text)).split(",")[1] ?? null;
      else if (inv.qr_image) qrBase64 = inv.qr_image;
    } catch (e) {
      console.error(`[invoice email qpay failed] order=${orderId}`, e);
    }

    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.vidan.mn").replace(/\/$/, "");
    const input = {
      no: invoiceNumber(order.order_number),
      orderNumber: order.order_number,
      orgName: order.invoice_org_name ?? "",
      orgTin: order.ebarimt_customer_tin ?? "",
      createdDate: formatUbDate(order.created_at),
      due: order.invoice_due_at ? formatUbDateTime(order.invoice_due_at) : "—",
      lines,
      net: vat.net,
      vat: vat.vat,
      total,
      qpayUrl,
      qrCid: qrBase64 ? QR_CID : null,
      invoiceUrl: `${site}/invoice/${order.id}`,
    };

    const body: Record<string, unknown> = {
      from,
      to: [to],
      subject: invoiceEmailSubject(input),
      html: invoiceEmailHtml(input),
      text: invoiceEmailText(input),
    };
    body.reply_to = process.env.EMAIL_REPLY_TO || INVOICE_SELLER.email;
    const bcc = process.env.INVOICE_EMAIL_BCC ?? INVOICE_SELLER.email;
    if (bcc && bcc !== "off" && bcc.toLowerCase() !== to.toLowerCase()) body.bcc = [bcc];
    if (qrBase64) {
      body.attachments = [
        { filename: "qpay-qr.png", content: qrBase64, content_type: "image/png", content_id: QR_CID },
      ];
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      // Дахин оролдох боломжтой болгож claim-ийг арилгана
      await admin.from("order_events").delete().eq("order_id", orderId).eq("event_type", eventType);
      console.error(`[invoice email failed ${res.status}] order=${orderId}`, json.message);
      return;
    }
    await admin
      .from("order_events")
      .update({ description: `Нэхэмжлэх имэйлээр → ${to} [${json.id ?? "ok"}]` })
      .eq("order_id", orderId)
      .eq("event_type", eventType);
  } catch (e) {
    console.error(`[invoice email failed] order=${orderId}`, e);
  }
}
