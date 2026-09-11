/**
 * QPay-ээр дамжуулан и-баримт үүсгэх урсгал.
 *
 * Хоёр хэсэгтэй:
 *  1. Нэхэмжлэх үүсгэхэд бараа бүрийн мөрийг (ангиллын код, баркод, НӨАТ)
 *     QPay-д дамжуулна — `buildOrderEbarimtLines`.
 *  2. Төлбөр төлөгдсөний дараа /ebarimt_v3/create дуудаж сугалааны дугаар,
 *     QR-ыг авч захиалгад хадгална — `createOrderEbarimtViaQpay`.
 *
 * PosAPI-ийн урсгалаас (src/lib/ebarimt/orders.ts) ялгаатай: манай сервер
 * төрийн системтэй шууд харьцахгүй, QPay нь НӨАТ төлөгчийн хувиар баримтыг
 * үүсгэж өгнө.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEbarimtReceipt } from "./client";
import { buildEbarimtLines, type QpayInvoiceLine } from "./ebarimt-lines";
import { TAX_RATE } from "@/lib/pricing";
import { normalizePhone, sendSms } from "@/lib/sms/client";

/** Ангиллын код олдохгүй үед ашиглах нөөц код */
const DEFAULT_CLASSIFICATION =
  process.env.EBARIMT_DEFAULT_CLASSIFICATION_CODE?.trim() || "2149290";

/** Хүргэлтийн үйлчилгээний ангиллын код */
const SHIPPING_CLASSIFICATION =
  process.env.EBARIMT_SHIPPING_CLASSIFICATION_CODE?.trim() || "6813000";

export function getDistrictCode(): string {
  return process.env.EBARIMT_DISTRICT_CODE?.trim() || "2620";
}

export type OrderEbarimtLines = {
  lines: QpayInvoiceLine[];
  /** Мөрүүдээс гарах нийт дүн */
  total: number;
  /** Захиалгын төлөх дүнтэй таарч байгаа эсэх */
  matchesOrderTotal: boolean;
};

/**
 * Захиалгын мөрүүдээс QPay-ийн и-баримт мөрүүдийг угсарна.
 *
 * ⚠️ `matchesOrderTotal` false бол и-баримттай нэхэмжлэх ҮҮСГЭЖ БОЛОХГҮЙ —
 *    QPay нийт дүнг мөрүүдээс тооцдог тул хэрэглэгч буруу дүн төлнө.
 */
export async function buildOrderEbarimtLines(
  orderId: string,
): Promise<OrderEbarimtLines | null> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, total, shipping, discount")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  const { data: items } = await admin
    .from("order_items")
    .select("product_name, quantity, unit_price, product_id")
    .eq("order_id", orderId);
  if (!items?.length) return null;

  // Бараануудын ангиллын код, баркодыг нэг дуудлагаар авна
  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
  const meta = new Map<string, { code: string | null; barcode: string | null }>();
  if (ids.length) {
    const { data: prods } = await admin
      .from("products")
      .select("id, classification_code, barcode")
      .in("id", ids);
    for (const p of prods ?? []) {
      meta.set(p.id, { code: p.classification_code, barcode: p.barcode });
    }
  }

  // ⚠️ Манай үнэ бодолт: order_items.unit_price нь НӨАТ-ГҮЙ цэвэр үнэ.
  //    Хэрэглэгч төлөхдөө (дэд дүн − хөнгөлөлт) + НӨАТ 10% + хүргэлт төлдөг
  //    (pricing.ts::calculateOrderTotals). И-баримтад НӨАТ БАГТСАН үнэ явна.
  const subtotal = items.reduce(
    (s, it) => s + Number(it.unit_price) * it.quantity,
    0,
  );
  const afterDiscount =
    subtotal - Math.max(0, Math.min(Number(order.discount) || 0, subtotal));
  const goodsGrossTotal = afterDiscount + Math.round(afterDiscount * TAX_RATE);

  const built = buildEbarimtLines({
    items: items.map((it) => {
      const m = it.product_id ? meta.get(it.product_id) : undefined;
      return {
        name: it.product_name,
        quantity: it.quantity,
        unitPrice: Number(it.unit_price),
        barcode: m?.barcode ?? null,
        classificationCode: m?.code ?? null,
      };
    }),
    shipping: Number(order.shipping) || 0,
    goodsGrossTotal,
    defaultClassificationCode: DEFAULT_CLASSIFICATION,
    shippingClassificationCode: SHIPPING_CLASSIFICATION,
  });

  // 1₮-өөс бага зөрүүг зөвшөөрнө (4 орны нарийвчлалын дугуйруулалт)
  const matchesOrderTotal =
    Math.abs(built.total - Number(order.total)) < 1;

  if (!matchesOrderTotal) {
    console.error(
      `[ebarimt] мөрийн нийлбэр захиалгын дүнтэй таарахгүй order=${orderId}: ` +
        `мөр=${built.total} захиалга=${order.total}`,
    );
  }

  return { lines: built.lines, total: built.total, matchesOrderTotal };
}

/**
 * Төлбөр баталгаажсаны дараа и-баримт бүртгүүлж, сугалааны дугаарыг
 * захиалгад хадгалаад хэрэглэгчид SMS-ээр илгээнэ.
 *
 * Best-effort — алдаа шидэхгүй, гол урсгалыг тасалдуулахгүй.
 * Idempotent — ebarimt_id аль хэдийн байвал алгасна.
 */
export async function createOrderEbarimtViaQpay(
  orderId: string,
  qpayPaymentId: string | null,
): Promise<void> {
  try {
    if (!qpayPaymentId) return;
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select(
        "id, order_number, payment_status, ebarimt_id, ebarimt_type, ebarimt_customer_tin, contact_phone",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return;
    if (order.payment_status !== "paid") return;
    if (order.ebarimt_id) return;

    const isCompany = order.ebarimt_type === "B2B_RECEIPT";
    const res = await createEbarimtReceipt(qpayPaymentId, {
      receiverType: isCompany ? "COMPANY" : "CITIZEN",
      // Иргэн бол и-баримт апп-д бүртгэлтэй утас, ААН бол регистр
      receiver: isCompany
        ? order.ebarimt_customer_tin
        : normalizePhone(order.contact_phone),
    });

    await admin
      .from("orders")
      .update({
        ebarimt_id: res.id,
        ebarimt_date: res.ebarimt_status_date ?? new Date().toISOString(),
        ebarimt_lottery: res.ebarimt_lottery ?? null,
        ebarimt_qr: res.ebarimt_qr_data ?? null,
      })
      .eq("id", orderId);

    await admin.from("order_events").insert({
      order_id: orderId,
      event_type: "ebarimt_created",
      description:
        `E-barimt үүслээ (QPay): ${res.id}` +
        (res.ebarimt_lottery ? ` · сугалаа ${res.ebarimt_lottery}` : ""),
    });

    await sendLotterySms(order.contact_phone, order.order_number, res.ebarimt_lottery);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[ebarimt qpay failed] order=${orderId}`, e);
    // Алдааг захиалгын түүхэнд үлдээнэ — console лог руу хандах боломжгүй тул
    // энэгүйгээр яагаад баримт гараагүйг хожим олох аргагүй болдог.
    try {
      await createAdminClient().from("order_events").insert({
        order_id: orderId,
        event_type: "ebarimt_failed",
        description: `E-barimt үүсгэж чадсангүй: ${message.slice(0, 400)}`,
      });
    } catch {
      // бүртгэл ч бичигдэхгүй бол хийх зүйлгүй
    }
  }
}

/** Сугалааны дугаарыг хэрэглэгчид SMS-ээр илгээнэ (best effort) */
async function sendLotterySms(
  phone: string | null,
  orderNumber: string,
  lottery: string | null | undefined,
): Promise<void> {
  try {
    if (!lottery) return;
    if (!process.env.SMS_API_KEY || !process.env.SMS_FROM_NUMBER) return;
    const to = normalizePhone(phone);
    if (!to) return;
    await sendSms({
      to,
      text: `VIDAN ${orderNumber} захиалгын и-баримт бэлэн. Сугалааны дугаар: ${lottery}`,
    });
  } catch (e) {
    console.error("[ebarimt lottery sms failed]", e);
  }
}
