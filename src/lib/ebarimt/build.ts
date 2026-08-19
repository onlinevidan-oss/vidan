/**
 * Захиалгаас E-Barimt PosAPI 3.0 баримтын хүсэлт (JSON) бүтээх.
 *
 * VIDAN бизнес дүрмүүд:
 *   · Үнэ НӨАТ-гүй (VAT-exclusive, net) — дээр нь 10% НӨАТ нэмнэ.
 *     (pricing.ts: total = subtotal + shipping + tax, tax = net × 10%)
 *     → unitPrice = net, totalVAT = net × 10%, totalAmount = net + НӨАТ.
 *   · НХАТ (city tax) = 0 (хүнсний жижиглэн). Шаардвал тохируулна.
 *   · Бараа бүр `classificationCode`-той байх ёстой (products хүснэгтэд нэмэх).
 */
import type {
  EbarimtItem,
  EbarimtPayment,
  EbarimtReceiptRequest,
  EbarimtSubReceipt,
  PaymentCode,
  ReceiptType,
  TaxType,
} from "./types";

/** Мерчантын тогтмол тохиргоо (env-ээс) */
export interface EbarimtMerchantConfig {
  merchantTin: string;
  districtCode: string;
  posNo: string;
  branchNo: string;
}

/** env-ээс мерчант тохиргоо унших (дутуу бол алдаа) */
export function getMerchantConfig(): EbarimtMerchantConfig {
  const merchantTin = process.env.EBARIMT_MERCHANT_TIN?.trim();
  const districtCode = process.env.EBARIMT_DISTRICT_CODE?.trim();
  const posNo = process.env.EBARIMT_POS_NO?.trim();
  const branchNo = process.env.EBARIMT_BRANCH_NO?.trim() || "001";
  if (!merchantTin || !districtCode || !posNo) {
    throw new Error(
      "E-Barimt мерчант тохиргоо дутуу (EBARIMT_MERCHANT_TIN / EBARIMT_DISTRICT_CODE / EBARIMT_POS_NO)",
    );
  }
  return { merchantTin, districtCode, posNo, branchNo };
}

export interface EbarimtLineItem {
  name: string;
  classificationCode: string;
  qty: number;
  unitPrice: number; // нэгжийн үнэ (НӨАТ-гүй, net), бүхэл төгрөг
  taxType?: TaxType; // default VAT_ABLE
  measureUnit?: string;
  barCode?: string | null;
  barCodeType?: string | null;
}

export interface BuildReceiptInput {
  type: Extract<ReceiptType, "B2C_RECEIPT" | "B2B_RECEIPT">;
  items: EbarimtLineItem[];
  payment: { code: PaymentCode; paidAmount: number };
  /** B2C үед — иргэний ebarimt дугаар (сугалаанд ордог, заавал биш) */
  consumerNo?: string | null;
  /** B2B үед — харилцагч байгууллагын ТТД (заавал) */
  customerTin?: string | null;
  billIdSuffix?: string;
  merchant?: EbarimtMerchantConfig;
}

const VAT_RATE = 0.1; // НӨАТ 10%

/** НӨАТ тооцоо — үнэ НӨАТ-гүй (net) гэж үзнэ (VAT_ABLE → net × 10%) */
function vatOf(net: number, taxType: TaxType): number {
  return taxType === "VAT_ABLE" ? Math.round(net * VAT_RATE) : 0;
}

/** НХАТ тооцоо — одоогоор 0 (хүнсний жижиглэн). Шаардвал энд өөрчилнө. */
function cityTaxOf(): number {
  return 0;
}

/**
 * Захиалгаас PosAPI баримтын хүсэлт бүтээх.
 * Татварын төрөл тус бүрээр дэд баримт (receipts[]) үүсгэнэ.
 */
export function buildReceiptRequest(
  input: BuildReceiptInput,
): EbarimtReceiptRequest {
  const merchant = input.merchant ?? getMerchantConfig();

  if (input.type === "B2B_RECEIPT" && !input.customerTin) {
    throw new Error("B2B баримтад харилцагчийн ТТД (customerTin) заавал");
  }

  // 1) Бараануудыг татварын төрлөөр бүлэглэх
  const groups = new Map<TaxType, EbarimtItem[]>();
  for (const li of input.items) {
    const taxType = li.taxType ?? "VAT_ABLE";
    const lineNet = li.unitPrice * li.qty; // НӨАТ-гүй мөрийн дүн
    const totalVAT = vatOf(lineNet, taxType);
    const totalCityTax = cityTaxOf();
    const item: EbarimtItem = {
      name: li.name,
      barCode: li.barCode ?? null,
      barCodeType: li.barCode ? (li.barCodeType ?? "GS1") : "UNDEFINED",
      classificationCode: li.classificationCode,
      taxProductCode: null,
      measureUnit: li.measureUnit ?? "ш",
      qty: li.qty,
      unitPrice: li.unitPrice, // net нэгжийн үнэ
      totalVAT,
      totalCityTax,
      totalAmount: lineNet + totalVAT + totalCityTax, // НӨАТ шингэсэн эцсийн дүн
    };
    const arr = groups.get(taxType);
    if (arr) arr.push(item);
    else groups.set(taxType, [item]);
  }

  // 2) Бүлэг тус бүрээр дэд баримт
  const receipts: EbarimtSubReceipt[] = [];
  for (const [taxType, items] of groups) {
    const sub: EbarimtSubReceipt = {
      taxType,
      merchantTin: merchant.merchantTin,
      customerTin: input.type === "B2B_RECEIPT" ? input.customerTin : null,
      totalAmount: sum(items, (i) => i.totalAmount),
      totalVAT: sum(items, (i) => i.totalVAT),
      totalCityTax: sum(items, (i) => i.totalCityTax),
      bankAccountNo: "",
      iBan: "",
      items,
    };
    receipts.push(sub);
  }

  const totalAmount = sum(receipts, (r) => r.totalAmount);
  const totalVAT = sum(receipts, (r) => r.totalVAT);
  const totalCityTax = sum(receipts, (r) => r.totalCityTax);

  const payment: EbarimtPayment = {
    code: input.payment.code,
    status: "PAID",
    paidAmount: input.payment.paidAmount,
  };

  return {
    branchNo: merchant.branchNo,
    totalAmount,
    totalVAT,
    totalCityTax,
    districtCode: merchant.districtCode,
    merchantTin: merchant.merchantTin,
    posNo: merchant.posNo,
    customerTin: input.type === "B2B_RECEIPT" ? input.customerTin : null,
    consumerNo: input.type === "B2C_RECEIPT" ? (input.consumerNo ?? null) : null,
    type: input.type,
    inactiveId: null,
    invoiceId: null,
    reportMonth: null,
    billIdSuffix: input.billIdSuffix ?? "01",
    receipts,
    payments: [payment],
  };
}

function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + f(x), 0);
}
