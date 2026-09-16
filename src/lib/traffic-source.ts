/**
 * Зочны эх сурвалжийг ойлгомжтой нэр рүү ангилна.
 *
 * ЯАГААД: GA4-ийн `sessionDefaultChannelGroup` нь "Organic Social",
 * "Paid Social" гэх мэт бүдүүн бүлэг өгдөг. Тэндээс Facebook мөн үү,
 * Instagram мөн үү, Messenger-ээс ирсэн үү гэдгийг ялгах боломжгүй.
 * Facebook-ийн трафик дангаараа 5 өөр домэйнээр ирдэг:
 *   facebook.com · m.facebook.com · l.facebook.com · lm.facebook.com
 * Сурталчилгаа нь `fb / paid` гэж, кампанит ажлын дугаараар тус тусдаа
 * мөр болж задардаг (52552353202379 гэх мэт) — эзэнд утгагүй.
 *
 * Энэ функц нь `sessionSource` + `sessionMedium`-ээс жинхэнэ сувгийг
 * тогтооно. Шинэ суваг нэмэхдээ доорх жагсаалтад нэмнэ.
 */

/** Эрэмбэ — хүснэгтэд тогтмол дараалалтай харагдана */
export const TRAFFIC_ORDER = [
  "facebook",
  "facebook_ads",
  "instagram",
  "instagram_ads",
  "messenger",
  "google",
  "google_ads",
  "direct",
  "referral",
  "other",
] as const;

export type TrafficKey = (typeof TRAFFIC_ORDER)[number];

export const TRAFFIC_LABEL: Record<TrafficKey, string> = {
  facebook: "Facebook",
  facebook_ads: "Facebook сурталчилгаа",
  instagram: "Instagram",
  instagram_ads: "Instagram сурталчилгаа",
  messenger: "Messenger (чат)",
  google: "Google хайлт",
  google_ads: "Google сурталчилгаа",
  direct: "Шууд орсон",
  referral: "Бусад сайтаас",
  other: "Тодорхойгүй",
};

/** Төлбөртэй трафикийн medium-ууд */
const PAID = new Set(["paid", "cpc", "ppc", "paidsocial", "paid_social", "cpm"]);

function isPaid(medium: string): boolean {
  return PAID.has(medium) || medium.startsWith("paid");
}

/**
 * @param source  GA4 `sessionSource` (жнь "facebook.com", "fb", "(direct)")
 * @param medium  GA4 `sessionMedium` (жнь "referral", "paid", "organic")
 */
export function classifyTrafficSource(source: string, medium: string): TrafficKey {
  const s = source.trim().toLowerCase();
  const m = medium.trim().toLowerCase();

  // Messenger-ийг Facebook-оос ӨМНӨ шалгана — `l.messenger.com` нь
  // facebook гэсэн үг агуулдаггүй ч дарааллыг тодорхой байлгая.
  if (s === "m.me" || s.endsWith("messenger.com")) return "messenger";

  // Facebook: сурталчилгааны source нь домэйн биш, зүгээр "fb" байдаг
  const isFacebook =
    s === "fb" ||
    s === "facebook" ||
    s === "facebook.com" ||
    s.endsWith(".facebook.com");
  if (isFacebook) return isPaid(m) ? "facebook_ads" : "facebook";

  const isInstagram =
    s === "ig" ||
    s === "instagram" ||
    s === "instagram.com" ||
    s.endsWith(".instagram.com");
  if (isInstagram) return isPaid(m) ? "instagram_ads" : "instagram";

  // Google: хайлт ба сурталчилгаа. accounts.google.com нь нэвтрэлтээс
  // буцсан зочин — хайлт биш тул энд оруулахгүй, referral болно.
  if (s === "google" || s === "google.com" || s === "www.google.com") {
    return isPaid(m) ? "google_ads" : "google";
  }

  if (s === "(direct)" || m === "(none)") return "direct";
  if (m === "referral") return "referral";

  return "other";
}

export type TrafficSourceRow = {
  source: string;
  medium: string;
  sessions: number;
  users: number;
};

export type ClassifiedTraffic = {
  key: TrafficKey;
  label: string;
  sessions: number;
  users: number;
};

/**
 * Түүхий мөрүүдийг сувгаар нэгтгэнэ. Сешнгүй суваг хүснэгтэд гарахгүй.
 *
 * ⚠️ Хэрэглэгчийн тоог НЭМЖ БОЛОХГҮЙ гэж бодож магадгүй — гэвч GA4 нь
 * мөр бүрт тухайн сувгийн хэрэглэгчийг өгдөг тул нэг хүн хоёр сувгаар
 * орсон бол хоёуланд нь тоологдоно. Facebook-ийн 4 домэйнийг нэгтгэхэд
 * энэ давхардал үлдэнэ — тиймээс хүснэгтэд СЕШН-ийг гол болгоно.
 */
export function classifyTraffic(rows: TrafficSourceRow[]): ClassifiedTraffic[] {
  const acc = new Map<TrafficKey, { sessions: number; users: number }>();

  for (const r of rows) {
    const key = classifyTrafficSource(r.source, r.medium);
    const cur = acc.get(key) ?? { sessions: 0, users: 0 };
    cur.sessions += r.sessions;
    cur.users += r.users;
    acc.set(key, cur);
  }

  return TRAFFIC_ORDER.filter((k) => (acc.get(k)?.sessions ?? 0) > 0).map((k) => ({
    key: k,
    label: TRAFFIC_LABEL[k],
    sessions: acc.get(k)!.sessions,
    users: acc.get(k)!.users,
  }));
}
