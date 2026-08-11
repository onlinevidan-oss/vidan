/**
 * E-Barimt PosAPI 3.0 төрлүүд.
 * Эх сурвалж: https://developer.itc.gov.mn/docs/ebarimt-api
 *   · POST   /rest/receipt  — баримт үүсгэх
 *   · DELETE /rest/receipt  — баримт буцаах (зөвхөн баталгаажаагүй B2C)
 */

export type ReceiptType =
  | "B2C_RECEIPT" // Бизнес → хувь хүн (баримт)
  | "B2B_RECEIPT" // Бизнес → бизнес (баримт)
  | "B2C_INVOICE" // Бизнес → хувь хүн (нэхэмжлэх)
  | "B2B_INVOICE" // Бизнес → бизнес (нэхэмжлэх)
  | "STOCK_QR";

export type TaxType = "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NO_VAT";

export type PaymentCode =
  | "CASH"
  | "PAYMENT_CARD"
  | "BANK_TRANSFER"
  | "BANK_TRANSFER_QPAY";

export type PaymentStatus = "PAID" | "PAY" | "REVERSED" | "ERROR";

export interface EbarimtItem {
  name: string;
  barCode?: string | null;
  barCodeType?: string | null; // "GS1" | "UNDEFINED" гэх мэт
  classificationCode: string; // Бараа/үйлчилгээний нэгдсэн ангиллын код
  taxProductCode?: string | null;
  measureUnit?: string | null;
  qty: number;
  unitPrice: number;
  totalVAT: number;
  totalCityTax: number;
  totalAmount: number;
  data?: Record<string, unknown> | null; // эмийн сан: { lotNo }
}

export interface EbarimtSubReceipt {
  totalAmount: number;
  taxType: TaxType;
  merchantTin: string;
  customerTin?: string | null;
  totalVAT: number;
  totalCityTax: number;
  bankAccountNo?: string;
  iBan?: string;
  invoiceId?: string | null;
  items: EbarimtItem[];
  data?: Record<string, unknown> | null;
}

export interface EbarimtPayment {
  code: PaymentCode;
  status: PaymentStatus;
  paidAmount: number;
  exchangeCode?: string;
  data?: Record<string, unknown> | null;
}

/** POST /rest/receipt — хүсэлтийн бие */
export interface EbarimtReceiptRequest {
  branchNo: string;
  totalAmount: number;
  totalVAT: number;
  totalCityTax: number;
  districtCode: string; // 4 оронтой байршлын код
  merchantTin: string; // баримт олгогчийн ТТД
  posNo: string; // дотоод кассын дугаар
  customerTin?: string | null; // зөвхөн B2B үед
  consumerNo?: string | null; // зөвхөн B2C үед (иргэний ebarimt дугаар)
  type: ReceiptType;
  inactiveId?: string | null;
  invoiceId?: string | null;
  reportMonth?: string | null;
  billIdSuffix?: string;
  data?: Record<string, unknown> | null;
  receipts: EbarimtSubReceipt[];
  payments: EbarimtPayment[];
}

/** POST /rest/receipt — амжилттай хариу */
export interface EbarimtReceiptResponse {
  id: string; // 33 оронтой ДДТД (толгой баримт)
  version: string;
  totalAmount: number;
  totalVAT: number;
  totalCityTax: number;
  branchNo: string;
  districtCode: string;
  merchantTin: string;
  posNo: string;
  consumerNo?: string;
  type: ReceiptType;
  receipts: Array<{
    id: string;
    totalAmount: number;
    taxType: TaxType;
    items: EbarimtItem[];
    merchantTin: string;
    totalVAT: number;
    totalCityTax: number;
  }>;
  payments: Array<{ code: string; paidAmount: number; status: string }>;
  posId: number;
  status: "SUCCESS" | "ERROR" | "PAYMENT";
  qrData: string; // ⚠️ хадгалахыг хориглоно — зөвхөн харуулах/хэвлэх
  lottery?: string; // ⚠️ хадгалахыг хориглоно — сугалааны дугаар
  date: string; // "yyyy-MM-dd HH:mm:ss"
  easy: boolean;
  message?: string; // алдааны тайлбар (status != SUCCESS үед)
}

/** DELETE /rest/receipt — буцаах хүсэлт */
export interface EbarimtReturnRequest {
  id: string;
  date: string; // "yyyy-MM-dd HH:mm:ss"
}
