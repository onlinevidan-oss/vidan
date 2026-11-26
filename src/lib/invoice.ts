/**
 * Байгууллагын нэхэмжлэл (0052) — цэвэр логик.
 *
 * Маягт: Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт
 * (эзний өгсөн загвар, 2026-11-17). Нэхэмжлэгчийн мэдээлэл тэр
 * загвараас, хаяг/утас нь сайтын хөлөөс.
 *
 * И-баримтыг нягтлан ГАРААР гаргана — энэ файл и-баримт үүсгэхгүй.
 */

/** Нэхэмжлэгч — Дөрвөн-Өлзий ХХК */
export const INVOICE_SELLER = {
  name: "Дөрвөн-Өлзий ХХК",
  tin: "2056488",
  address: "Улаанбаатар, Баянгол дүүрэг, 20-р хороо, Үйлдвэрийн баруун бүс ХД-50",
  phone: "7575-2525",
  email: "Finance01.durvunulzii@gmail.com",
  bank: "ХААН банк",
  account: "5753033556",
  /** QPay-ийн төлбөрүүд яг энэ данс руу ордгийг 11-17-нд шалгасан */
  iban: "MN850005005753033556",
} as const;

/** Нэхэмжлэлийн дугаар — захиалгын дугаарын цифрүүд ("#10350" → "10350") */
export function invoiceNumber(orderNumber: string): string {
  return orderNumber.replace(/\D/g, "");
}

// ---------- Мөнгөн дүн үсгээр ----------
// Тоо бүр араасаа үг (тоо эсвэл "төгрөг") авдаг тул хамаатуулах хэлбэрээр:
// "таван", "тавин", "зуун", "мянган". Мянга араасаа тоо авбал "мянга".
const UNITS = ["", "нэг", "хоёр", "гурван", "дөрвөн", "таван", "зургаан", "долоон", "найман", "есөн"];
const TENS = ["", "арван", "хорин", "гучин", "дөчин", "тавин", "жаран", "далан", "наян", "ерэн"];

/** 1–999 → үгээр (хамаатуулах хэлбэр) */
function hundredsToWords(n: number): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  if (h) out.push(UNITS[h], "зуун");
  if (t) out.push(TENS[t]);
  if (u) out.push(UNITS[u]);
  return out;
}

/**
 * Бүхэл төгрөгийг үсгээр: 650000 → "зургаан зуун тавин мянган төгрөг".
 * Сөрөг, бутархай дүнд ашиглахгүй (нэхэмжлэлийн нийт дүн бүхэл байдаг).
 */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "тэг төгрөг";

  const scales: [number, string, string][] = [
    // [хэмжээ, араасаа тоо авах үеийн хэлбэр, шууд "төгрөг"-ийн өмнөх хэлбэр]
    [1_000_000_000, "тэрбум", "тэрбум"],
    [1_000_000, "сая", "сая"],
    [1_000, "мянга", "мянган"],
  ];

  const words: string[] = [];
  let rest = n;
  for (const [size, mid, last] of scales) {
    const chunk = Math.floor(rest / size);
    if (!chunk) continue;
    rest %= size;
    words.push(...hundredsToWords(chunk), rest ? mid : last);
  }
  if (rest) words.push(...hundredsToWords(rest));
  words.push("төгрөг");
  return words.join(" ");
}

// ---------- Нэхэмжлэлийн мөрүүд ----------
export type InvoiceOrder = {
  discount: number;
  shipping: number;
  /** Хүргэлтийн НӨАТ (orders.tax — зөвхөн хүргэлт дээр нэмсэн) */
  tax: number;
  total: number;
  voucher_amount: number;
  items: {
    product_name: string;
    code: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
};

export type InvoiceLine = {
  name: string;
  code: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

/**
 * Захиалгыг нэхэмжлэлийн мөр болгоно. Барааны үнэд НӨАТ шингэсэн,
 * хүргэлтийг НӨАТ-тай нь нэг мөрөөр (сайт, и-баримттай ижил дүрэм).
 * Хөнгөлөлт ба эрхийн бичиг нь хасах мөр — нийлбэр нь яг `total`.
 */
export function buildInvoiceLines(o: InvoiceOrder): {
  lines: InvoiceLine[];
  sum: number;
  matchesTotal: boolean;
} {
  const lines: InvoiceLine[] = o.items.map((i) => ({
    name: i.product_name,
    code: i.code ?? "",
    unit: "ш",
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    amount: Number(i.subtotal),
  }));

  const discount = Number(o.discount);
  if (discount > 0) {
    lines.push({ name: "Хөнгөлөлт", code: "", unit: "", quantity: 1, unitPrice: -discount, amount: -discount });
  }

  const shippingGross = Number(o.shipping) + Number(o.tax);
  if (shippingGross > 0) {
    lines.push({
      name: "Хүргэлтийн үйлчилгээ",
      code: "",
      unit: "удаа",
      quantity: 1,
      unitPrice: shippingGross,
      amount: shippingGross,
    });
  }

  const voucher = Number(o.voucher_amount);
  if (voucher > 0) {
    lines.push({ name: "Эрхийн бичиг", code: "", unit: "", quantity: 1, unitPrice: -voucher, amount: -voucher });
  }

  const sum = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, sum, matchesTotal: sum === Number(o.total) };
}

// ---------- Байгууллагын мэдээлэл шалгах ----------
/** Байгууллагын РД — 7 оронтой регистр, эсвэл 11–12 оронтой ТТД */
export function validateOrgTin(tin: string): string | null {
  const t = tin.trim();
  if (!t) return "Байгууллагын регистрийн дугаараа оруулна уу";
  if (!/^(\d{7}|\d{11,12})$/.test(t)) {
    return "Регистрийн дугаар 7 оронтой (эсвэл ТТД 11–12 оронтой) тоо байна";
  }
  return null;
}

export function validateOrgName(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return "Байгууллагын нэрээ оруулна уу";
  if (n.length > 200) return "Байгууллагын нэр хэт урт байна";
  return null;
}

/** Нэхэмжлэл хүлээн авах имэйл — энгийн бүтцийн шалгалт */
export function validateInvoiceEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return "Нэхэмжлэл хүлээн авах имэйлээ оруулна уу";
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) {
    return "Имэйл хаяг буруу байна";
  }
  return null;
}

// ---------- Төлөв (админ, захиалагчийн хуудас) ----------
export type InvoiceState = "unconfirmed" | "paid" | "cancelled";

export function invoiceState(o: { payment_status: string; status: string }): InvoiceState {
  if (o.payment_status === "paid") return "paid";
  if (o.status === "cancelled") return "cancelled";
  return "unconfirmed";
}

/** Төлөх хугацаа дуустал — "23ц 10м", "45м"; өнгөрсөн бол null */
export function invoiceTimeLeft(dueAt: string | null, now: Date = new Date()): string | null {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - now.getTime();
  if (ms <= 0) return null;
  const min = Math.ceil(ms / 60_000);
  const h = Math.floor(min / 60);
  return h > 0 ? `${h}ц ${min % 60}м` : `${min}м`;
}

/** Төлбөрийн аргын хүнд ойлгомжтой нэр */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  qpay: "QPay",
  card: "Карт",
  cash: "Бэлэн",
  toki: "Toki",
  socialpay: "SocialPay",
  invoice: "Нэхэмжлэл",
};
