/**
 * Хадгалсан захиалгаас баримт ХАРУУЛАХ объект угсрах — цэвэр функц.
 *
 * ЯАГААД ТУСДАА ФАЙЛ: энэ логик DB-д хүрэхгүй, зөвхөн тоо бодно. Өмнө нь
 * `orders.ts` (server-only) дотор байснаас болж тестлэгдэхгүй байсан бөгөөд
 * улмаар PosAPI руу ИЛГЭЭСЭН баримтаас зөрж, промо хөнгөлөлттэй захиалгад
 * хэрэглэгчид төлснөөсөө өндөр дүн харуулж байв. Одоо хоёулаа
 * `allocateOrderDiscount`-ыг дуудна.
 *
 * ⚠️ Compliance: lottery/qr зөвхөн тухайн худалдан авагчид баримтаа харуулах
 *    зорилгоор ашиглагдана.
 */
// Node-ийн тест энэ модулийг шууд ачаалдаг тул өргөтгөл заавал (ESM шаардлага)
import { allocateOrderDiscount } from "./build.ts";
import type { EbarimtReceiptResponse, ReceiptType } from "./types";
import { shippingVat } from "../pricing.ts";

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
    discount: number;
  },
  items: { product_name: string; quantity: number; unit_price: number }[],
): EbarimtReceiptResponse | null {
  if (!order.ebarimt_id || !order.ebarimt_qr) return null;

  const type = (order.ebarimt_type as ReceiptType) ?? "B2C_RECEIPT";

  // Промо хөнгөлөлтийг PosAPI руу илгээсэнтэй ЯГ ижил аргаар хуваарилна.
  // Эс тэгвэл хэрэглэгч төлснөөсөө өндөр дүнтэй баримт харна.
  const { lines: discounted } = allocateOrderDiscount(
    items.map((it) => ({
      name: it.product_name,
      qty: it.quantity,
      unitPrice: Number(it.unit_price),
    })),
    Number(order.discount) || 0,
  );

  const receiptItems = discounted.map((it) => {
    const net = it.unitPrice * it.qty;
    // Үнэд НӨАТ шингэсэн (санхүү, 2026-09-14) — багтсаныг задална, нэмэхгүй
    const vat = Math.round((net * 0.1) / 1.1);
    return {
      name: it.name,
      classificationCode: "",
      qty: it.qty,
      unitPrice: it.unitPrice,
      totalVAT: vat,
      totalCityTax: 0,
      totalAmount: net,
    };
  });
  // Хүргэлтийн үнэн дээр НӨАТ нэмэгддэг — баримтад НӨАТ нэмсэн дүнгээр очно
  const shippingNet = Number(order.shipping) || 0;
  if (shippingNet > 0) {
    const vat = shippingVat(shippingNet);
    receiptItems.push({
      name: "Хүргэлтийн үйлчилгээ",
      classificationCode: "",
      qty: 1,
      unitPrice: shippingNet + vat,
      totalVAT: vat,
      totalCityTax: 0,
      totalAmount: shippingNet + vat,
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
