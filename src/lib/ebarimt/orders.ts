/**
 * Захиалга ↔ E-Barimt холбогч логик (admin client).
 *  · createOrderEbarimt — төлбөр батлагдсаны дараа баримт үүсгэж, хадгална
 *    (idempotent: order.ebarimt_id байвал алгасна; best-effort).
 *
 * Баримтыг ХАРУУЛАХ талын цэвэр логик `./display.ts`-д байна (тестлэгддэг).
 *
 * ⚠️ Compliance: lottery/qr зөвхөн тухайн худалдан авагчид баримтаа харуулах
 *    зорилгоор л хадгалагдана.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  allocateOrderDiscount,
  buildReceiptRequest,
  type EbarimtLineItem,
} from "./build";
import { createReceipt, isEbarimtConfigured } from "./posapi";
import type { PaymentCode, ReceiptType } from "./types";

/** Барааны ангиллын код олдохгүй үед сүүлчийн fallback */
const DEFAULT_CLASSIFICATION =
  process.env.EBARIMT_DEFAULT_CLASSIFICATION_CODE?.trim() || "6215900";

/** Захиалгын төлбөрийн арга → e-barimt payment code */
function paymentCodeOf(method: string | null): PaymentCode {
  switch (method) {
    case "qpay":
      return "BANK_TRANSFER_QPAY";
    case "card":
      return "PAYMENT_CARD";
    case "cash":
      return "CASH";
    default:
      return "BANK_TRANSFER";
  }
}

/**
 * Төлбөр батлагдсан захиалгад e-barimt үүсгэж, дүнг order-т хадгална.
 * Best-effort — алдаа шидэхгүй, гол урсгалыг тасалдуулахгүй.
 */
export async function createOrderEbarimt(orderId: string): Promise<void> {
  try {
    if (!isEbarimtConfigured()) return; // PosAPI тохируулаагүй → алгасна

    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select(
        "id, total, shipping, discount, payment_method, payment_status, ebarimt_id, ebarimt_type, ebarimt_customer_tin, ebarimt_consumer_no",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (!order) return;
    if (order.payment_status !== "paid") return;
    if (order.ebarimt_id) return; // аль хэдийн үүссэн (idempotent)

    const { data: items } = await admin
      .from("order_items")
      .select("product_name, quantity, unit_price, product_id")
      .eq("order_id", orderId);

    if (!items?.length) return;

    // Барааны ангиллын кодыг products-оос авах
    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[];
    const codeByProduct = new Map<string, string>();
    if (productIds.length) {
      const { data: prods } = await admin
        .from("products")
        .select("id, classification_code")
        .in("id", productIds);
      for (const p of prods ?? []) {
        if (p.classification_code) codeByProduct.set(p.id, p.classification_code);
      }
    }

    const goodsLines: EbarimtLineItem[] = items.map((it) => ({
      name: it.product_name,
      classificationCode:
        (it.product_id && codeByProduct.get(it.product_id)) || DEFAULT_CLASSIFICATION,
      qty: it.quantity,
      unitPrice: Number(it.unit_price),
      taxType: "VAT_ABLE",
      measureUnit: "ш",
    }));

    // ПРОМО ХӨНГӨЛӨЛТ — баримт бодит төлсөн дүнг тусгах ёстой.
    // Хуваарилалт нь ebarimtDisplayFromOrder-той нийтлэг функцээр явна.
    const { lines: lineItems, residual } = allocateOrderDiscount(
      goodsLines,
      Number(order.discount) || 0,
    );
    if (residual !== 0) {
      console.warn(
        `[ebarimt] хөнгөлөлт хуваарилахад ${residual}₮ зөрүү үлдлээ order=${orderId}`,
      );
    }

    // Хүргэлтийн төлбөр — тусдаа мөр (НӨАТ-гүй, одоогийн үнэ бодлоготой нийцүүлэв)
    const shipping = Number(order.shipping) || 0;
    if (shipping > 0) {
      lineItems.push({
        name: "Хүргэлтийн үйлчилгээ",
        classificationCode: DEFAULT_CLASSIFICATION,
        qty: 1,
        unitPrice: shipping,
        taxType: "NO_VAT",
        measureUnit: "удаа",
      });
    }

    const type = (order.ebarimt_type as ReceiptType) ?? "B2C_RECEIPT";
    const request = buildReceiptRequest({
      type: type === "B2B_RECEIPT" ? "B2B_RECEIPT" : "B2C_RECEIPT",
      items: lineItems,
      consumerNo: order.ebarimt_consumer_no,
      customerTin: order.ebarimt_customer_tin,
      payment: { code: paymentCodeOf(order.payment_method), paidAmount: 0 },
    });
    // Төлсөн дүн = баримтын нийт дүн (PosAPI paidAmount==totalAmount шаарддаг)
    request.payments[0].paidAmount = request.totalAmount;

    const res = await createReceipt(request);

    await admin
      .from("orders")
      .update({
        ebarimt_id: res.id,
        ebarimt_date: res.date,
        ebarimt_lottery: res.lottery ?? null,
        ebarimt_qr: res.qrData,
      })
      .eq("id", orderId);

    await admin.from("order_events").insert({
      order_id: orderId,
      event_type: "ebarimt_created",
      description: `E-barimt үүслээ: ${res.id}${res.lottery ? ` · сугалаа ${res.lottery}` : ""}`,
    });
  } catch (e) {
    console.error(`[ebarimt create failed] order=${orderId}`, e);
  }
}

