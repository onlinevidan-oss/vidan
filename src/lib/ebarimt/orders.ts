/**
 * Захиалга ↔ E-Barimt холбогч логик (admin client).
 *  · createOrderEbarimt — төлбөр батлагдсаны дараа баримт үүсгэж, хадгална
 *    (idempotent: order.ebarimt_id байвал алгасна; best-effort).
 *  · ebarimtDisplayFromOrder — хадгалсан талбараас баримт харуулах объект угсрах.
 *
 * ⚠️ Compliance: lottery/qr зөвхөн тухайн худалдан авагчид баримтаа харуулах
 *    зорилгоор л хадгалагдана.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReceiptRequest, type EbarimtLineItem } from "./build";
import { createReceipt, isEbarimtConfigured } from "./posapi";
import type {
  EbarimtReceiptResponse,
  PaymentCode,
  ReceiptType,
} from "./types";

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

    const lineItems: EbarimtLineItem[] = items.map((it) => ({
      name: it.product_name,
      classificationCode:
        (it.product_id && codeByProduct.get(it.product_id)) || DEFAULT_CLASSIFICATION,
      qty: it.quantity,
      unitPrice: Number(it.unit_price),
      taxType: "VAT_ABLE",
      measureUnit: "ш",
    }));

    // ПРОМО ХӨНГӨЛӨЛТ — баримт бодит төлсөн дүнг тусгах ёстой.
    // Захиалгын түвшний хөнгөлөлтийг мөр бүрд харьцаагаар хуваарилж,
    // нэгжийн үнийг бууруулна (unitPrice × qty = мөрийн бодит дүн).
    const discount = Number(order.discount) || 0;
    if (discount > 0) {
      const goodsTotal = lineItems.reduce((s, li) => s + li.unitPrice * li.qty, 0);
      if (goodsTotal > 0) {
        const ratio = (goodsTotal - discount) / goodsTotal;
        for (const li of lineItems) {
          li.unitPrice = Math.max(0, Math.round(li.unitPrice * ratio));
        }
        // Бүхэл тоонд хуваарилахад үлдэгдэл гарч болзошгүй — хянахын тулд log
        const after = lineItems.reduce((s, li) => s + li.unitPrice * li.qty, 0);
        const residual = goodsTotal - discount - after;
        if (residual !== 0) {
          console.warn(
            `[ebarimt] хөнгөлөлт хуваарилахад ${residual}₮ зөрүү үлдлээ order=${orderId}`,
          );
        }
      }
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

/**
 * Хадгалсан order талбараас ReceiptView-д зориулсан объект угсрах.
 * ebarimt_id байхгүй бол null.
 */
export function ebarimtDisplayFromOrder(
  order: {
    ebarimt_id: string | null;
    ebarimt_date: string | null;
    ebarimt_type: string | null;
    ebarimt_lottery: string | null;
    ebarimt_qr: string | null;
    tax: number;
    total: number;
    shipping: number;
  },
  items: { product_name: string; quantity: number; unit_price: number }[],
): EbarimtReceiptResponse | null {
  if (!order.ebarimt_id || !order.ebarimt_qr) return null;

  const type = (order.ebarimt_type as ReceiptType) ?? "B2C_RECEIPT";
  const receiptItems = items.map((it) => {
    const net = Number(it.unit_price) * it.quantity;
    const vat = Math.round(net * 0.1);
    return {
      name: it.product_name,
      classificationCode: "",
      qty: it.quantity,
      unitPrice: Number(it.unit_price),
      totalVAT: vat,
      totalCityTax: 0,
      totalAmount: net + vat,
    };
  });
  const shipping = Number(order.shipping) || 0;
  if (shipping > 0) {
    receiptItems.push({
      name: "Хүргэлтийн үйлчилгээ",
      classificationCode: "",
      qty: 1,
      unitPrice: shipping,
      totalVAT: 0,
      totalCityTax: 0,
      totalAmount: shipping,
    });
  }

  const totalAmount = receiptItems.reduce((a, i) => a + i.totalAmount, 0);
  const totalVAT = receiptItems.reduce((a, i) => a + i.totalVAT, 0);

  return {
    id: order.ebarimt_id,
    version: "3.0",
    totalAmount,
    totalVAT,
    totalCityTax: 0,
    branchNo: "",
    districtCode: "",
    merchantTin: process.env.EBARIMT_MERCHANT_TIN ?? "",
    posNo: "",
    type,
    receipts: [
      {
        id: order.ebarimt_id,
        totalAmount,
        taxType: "VAT_ABLE",
        items: receiptItems,
        merchantTin: process.env.EBARIMT_MERCHANT_TIN ?? "",
        totalVAT,
        totalCityTax: 0,
      },
    ],
    payments: [],
    posId: 0,
    status: "SUCCESS",
    qrData: order.ebarimt_qr,
    lottery: order.ebarimt_lottery ?? undefined,
    date: order.ebarimt_date ?? "",
    easy: false,
  };
}
