/**
 * Эрхийн бичгийн (0050) админ талын цэвэр логик — үүсгэх утгыг шалгах,
 * код үүсгэх, үлдэгдэл ба төлөв.
 *
 * Үлдэгдлийг БОДОХ нь захиалга дээр DB-ийн gift_voucher_balance — энд
 * зөвхөн жагсаалтад харуулахад ижил дүрмээр (цуцлагдсан захиалга
 * тооцогдохгүй) дахин нэгтгэнэ.
 */

export type VoucherInput = {
  /** Хоосон бол сервер санамсаргүй код үүсгэнэ */
  code: string;
  /** Эрхийн бичгийн дүн (₮) */
  amount: number;
  /** УБ өдөр, энэ өдрийг дуустал хүчинтэй. "" = хугацаагүй */
  ends_on: string;
  /** Дотоод тэмдэглэл — хэнд, юуны төлөө */
  note: string;
};

/** Андуурагдах тэмдэгтгүй (0/O, 1/I/L) — утсаар хэлэхэд, гараар бичихэд */
export const VOUCHER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Санамсаргүй 8 тэмдэгт — таахад бэрх (31^8 ≈ 850 тэрбум) */
export function generateVoucherCode(randomBytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += VOUCHER_CODE_ALPHABET[randomBytes[i] % VOUCHER_CODE_ALPHABET.length];
  }
  return s;
}

/** Кодыг том үсэг болгож, зай болон тэмдэгтийг арилгана */
export function normalizeVoucherCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Алдаатай бол хүнд ойлгомжтой мессеж, зөв бол null */
export function validateVoucher(v: VoucherInput, today: string): string | null {
  if (v.code !== "" && !/^[A-Z0-9]{6,20}$/.test(v.code)) {
    return "Код 6–20 тэмдэгт, зөвхөн латин үсэг ба тоо байх ёстой (хоосон бол автоматаар үүснэ)";
  }
  if (!Number.isInteger(v.amount) || v.amount < 1_000) {
    return "Дүн 1,000₮-өөс багагүй бүхэл тоо байх ёстой";
  }
  if (v.amount > 10_000_000) return "Дүн хэт их байна";
  if (v.ends_on !== "") {
    if (!DATE_KEY.test(v.ends_on)) return "Дуусах огноо буруу байна";
    if (v.ends_on < today) return "Дуусах огноо өнгөрсөн байна";
  }
  if (v.note.length > 200) return "Тэмдэглэл 200 тэмдэгтээс хэтрэхгүй";
  return null;
}

export type VoucherUse = { amount: number; cancelled: boolean };

/** Үлдэгдэл = дүн − цуцлагдаагүй захиалгад зарцуулсан (gift_voucher_balance-тай ижил) */
export function voucherBalance(amount: number, uses: VoucherUse[]): number {
  const spent = uses.reduce((s, u) => s + (u.cancelled ? 0 : u.amount), 0);
  return amount - spent;
}

export type VoucherState = "active" | "off" | "expired" | "empty";

export const VOUCHER_STATE_LABEL: Record<VoucherState, string> = {
  active: "Идэвхтэй",
  off: "Унтраасан",
  expired: "Хугацаа дууссан",
  empty: "Үлдэгдэлгүй",
};

/** place_order-ийн шалгалтын дарааллаар */
export function voucherState(
  v: { is_active: boolean; ends_at: string | null; balance: number },
  now: Date = new Date(),
): VoucherState {
  if (!v.is_active) return "off";
  if (v.ends_at && now > new Date(v.ends_at)) return "expired";
  if (v.balance <= 0) return "empty";
  return "active";
}
