/**
 * Промо кодын админ талын логик — цэвэр функцууд.
 *
 * Хөнгөлөлтийг БОДОХ нь энд биш: `validate_promo` (SQL) ганцаараа бодно,
 * checkout ба place_order хоёулаа түүнийг дуудна. Энд зөвхөн админы
 * оруулсан утгыг шалгах, жагсаалтад төлөвийг нь харуулах хэсэг байна.
 */

/** validate_promo одоогоор зөвхөн энэ хоёр төрлийг дэмждэг (bogo, free_shipping үгүй) */
export const PROMO_TYPES = ["percent", "fixed"] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const PROMO_SEGMENTS = ["all", "new", "vip"] as const;
export type PromoSegment = (typeof PROMO_SEGMENTS)[number];

export const PROMO_SEGMENT_LABEL: Record<PromoSegment, string> = {
  all: "Бүх хэрэглэгч",
  new: "Шинэ хэрэглэгч",
  vip: "VIP хэрэглэгч",
};

export type PromoInput = {
  code: string;
  name: string;
  type: PromoType;
  value: number;
  min_order: number;
  /** Хувийн хөнгөлөлтийн дээд хязгаар (₮). null = хязгааргүй */
  max_discount: number | null;
  segment: PromoSegment;
  /** УБ өдөр "YYYY-MM-DD" */
  starts_on: string;
  /** УБ өдөр, энэ өдрийг дуустал хүчинтэй. "" = хугацаагүй */
  ends_on: string;
  /** Нийт хэдэн удаа ашиглагдах. null = хязгааргүй */
  usage_limit: number | null;
  /** Нэг хэрэглэгч хэдэн удаа. null = хязгааргүй */
  usage_per_user: number | null;
  is_active: boolean;
};

/** Кодыг том үсэг болгож, зай болон тэмдэгтийг арилгана */
export function normalizePromoCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isInt = (n: unknown): n is number => Number.isInteger(n);

/** Алдаатай бол хүнд ойлгомжтой мессеж, зөв бол null */
export function validatePromo(p: PromoInput): string | null {
  if (!/^[A-Z0-9]{3,20}$/.test(p.code)) {
    return "Код 3–20 тэмдэгт, зөвхөн латин үсэг ба тоо байх ёстой";
  }
  if (!p.name.trim()) return "Нэр оруулна уу";
  if (!(PROMO_TYPES as readonly string[]).includes(p.type)) {
    return "Хөнгөлөлтийн төрөл буруу";
  }
  if (!(PROMO_SEGMENTS as readonly string[]).includes(p.segment)) {
    return "Хэрэглэгчийн бүлэг буруу";
  }

  if (p.type === "percent") {
    if (!isInt(p.value) || p.value < 1 || p.value > 100) {
      return "Хувь 1–100 хооронд бүхэл тоо байх ёстой";
    }
  } else if (!isInt(p.value) || p.value < 100) {
    return "Хөнгөлөх дүн 100₮-өөс багагүй бүхэл тоо байх ёстой";
  }

  if (!isInt(p.min_order) || p.min_order < 0) {
    return "Захиалгын доод дүн 0 ба түүнээс их байх ёстой";
  }
  if (p.max_discount !== null && (!isInt(p.max_discount) || p.max_discount < 1)) {
    return "Хөнгөлөлтийн дээд хязгаар 0-ээс их байх ёстой";
  }
  // Тогтмол дүнгийн хөнгөлөлт захиалгын дүнгээс их байвал доод дүнгээр
  // хамгаалагдаагүй бол бараг үнэгүй захиалга гарна
  if (p.type === "fixed" && p.min_order < p.value) {
    return "Захиалгын доод дүн хөнгөлөх дүнгээс багагүй байх ёстой";
  }

  if (!DATE_KEY.test(p.starts_on)) return "Эхлэх огноо оруулна уу";
  if (p.ends_on !== "") {
    if (!DATE_KEY.test(p.ends_on)) return "Дуусах огноо буруу байна";
    if (p.ends_on < p.starts_on) return "Дуусах огноо эхлэхээс өмнө байна";
  }

  if (p.usage_limit !== null && (!isInt(p.usage_limit) || p.usage_limit < 1)) {
    return "Нийт ашиглах тоо 1-ээс багагүй байх ёстой";
  }
  if (
    p.usage_per_user !== null &&
    (!isInt(p.usage_per_user) || p.usage_per_user < 1)
  ) {
    return "Нэг хэрэглэгчийн ашиглах тоо 1-ээс багагүй байх ёстой";
  }
  return null;
}

export type PromoState =
  | "active"
  | "off"
  | "scheduled"
  | "expired"
  | "used_up"
  | "unsupported";

export const PROMO_STATE_LABEL: Record<PromoState, string> = {
  active: "Идэвхтэй",
  off: "Унтраасан",
  scheduled: "Эхлээгүй",
  expired: "Хугацаа дууссан",
  used_up: "Дууссан",
  unsupported: "Ажиллахгүй төрөл",
};

/**
 * Код одоо ажиллах уу — validate_promo-гийн шалгалтын дарааллаар.
 * (Хэрэглэгч тус бүрийн хязгаар, бүлэг нь хэн хэрэглэхээс хамаарах тул
 * энд орохгүй.)
 */
export function promoState(
  p: {
    type: string;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    usage_limit: number | null;
    usage_count: number;
  },
  now: Date = new Date(),
): PromoState {
  if (!(PROMO_TYPES as readonly string[]).includes(p.type)) return "unsupported";
  if (!p.is_active) return "off";
  if (p.starts_at && now < new Date(p.starts_at)) return "scheduled";
  if (p.ends_at && now > new Date(p.ends_at)) return "expired";
  if (p.usage_limit !== null && p.usage_count >= p.usage_limit) return "used_up";
  return "active";
}
