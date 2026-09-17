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
 *
 * ШУУД ОРСОН гэдгийн дотор юу байгааг GA4 мэддэггүй: QR код, чатын
 * холбоос, SMS, гараар бичсэн хаяг — бүгд эх сурвалжгүй ирдэг тул
 * ялгах шинж тэмдэг байхгүй. Ганц зам нь өөрсдийн тараадаг холбоост
 * `?utm_source=` шошго тавих (админ дахь холбоос үүсгэгч).
 * Тиймээс доорх UTM_KEYS нь тэр шошгуудыг таньж, тусдаа мөр болгоно.
 */

/** Эрэмбэ — хүснэгтэд тогтмол дараалалтай харагдана */
export const TRAFFIC_ORDER = [
  "facebook",
  "facebook_ads",
  "instagram",
  "google",
  "google_ads",
  "chat",
  "sms",
  "qr",
  "email",
  "print",
  "direct",
  "referral",
  "other",
] as const;

/**
 * Хандалт байхгүй байсан ч ҮРГЭЛЖ харагдах сувгууд.
 *
 * Бусад нь (Google сурталчилгаа, QR, и-мэйл, хэвлэмэл, тодорхойгүй)
 * зөвхөн бодит хандалт ирсэн үед л мөр болно — эдгээр нь тухай бүрд
 * ашиглагддаг суваг тул байнга 0-ээр харагдвал хүснэгт дэмий уртсана.
 */
export const TRAFFIC_ALWAYS_SHOWN: readonly TrafficKey[] = [
  "facebook",
  "facebook_ads",
  "instagram",
  "google",
  "chat",
  "sms",
  "direct",
  "referral",
];

export type TrafficKey = (typeof TRAFFIC_ORDER)[number];

export const TRAFFIC_LABEL: Record<TrafficKey, string> = {
  facebook: "Facebook",
  facebook_ads: "Facebook сурталчилгаа",
  instagram: "Instagram",
  google: "Google хайлт",
  google_ads: "Google сурталчилгаа",
  chat: "Чат",
  sms: "Мессеж (SMS)",
  qr: "QR код",
  email: "И-мэйл",
  print: "Хэвлэмэл, сав баглаа",
  direct: "Гараар бичсэн",
  referral: "Бусад сайтаас",
  other: "Тодорхойгүй",
};

/**
 * Өөрсдийн тавьдаг `utm_source` шошгууд. Холбоос үүсгэгч эдгээрийг
 * ашиглана — хоёр газар зөрвөл трафик буруу ангилагдана.
 */
const UTM_KEYS: Record<string, TrafficKey> = {
  qr: "qr",
  sms: "sms",
  email: "email",
  print: "print",
  // Чат гэдэгт Messenger, Viber, Instagram DM бүгд багтана — аль
  // апп-аар ирснийг салгах нь эзний шийдвэрт нөлөөлдөггүй.
  chat: "chat",
  messenger: "chat",
  viber: "chat",
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

  // Өөрсдийн шошго тэргүүн эрэмбэтэй — гараар тавьсан утга учир
  // домэйн таамаглахаас найдвартай.
  const tagged = UTM_KEYS[s];
  if (tagged) return tagged;

  // Чатыг Facebook-оос ӨМНӨ шалгана — `l.messenger.com` нь facebook
  // гэсэн үг агуулдаггүй ч дарааллыг тодорхой байлгая.
  if (s === "m.me" || s.endsWith("messenger.com")) return "chat";
  if (s === "viber" || s.endsWith("viber.com")) return "chat";

  // Facebook: сурталчилгааны source нь домэйн биш, зүгээр "fb" байдаг
  const isFacebook =
    s === "fb" ||
    s === "facebook" ||
    s === "facebook.com" ||
    s.endsWith(".facebook.com");
  if (isFacebook) return isPaid(m) ? "facebook_ads" : "facebook";

  // Instagram-ыг органик/сурталчилгаа гэж салгахгүй — Facebook шиг
  // хоёр тусдаа мөр болгох хэмжээний урсгал байхгүй.
  const isInstagram =
    s === "ig" ||
    s === "instagram" ||
    s === "instagram.com" ||
    s.endsWith(".instagram.com");
  if (isInstagram) return "instagram";

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
 * Түүхий мөрүүдийг сувгаар нэгтгэнэ.
 *
 * `includeEmpty` — хандалтгүй үндсэн сувгийг ч буцаана
 * (`TRAFFIC_ALWAYS_SHOWN`). Хүснэгт хугацаа болгонд ижил бүтэцтэй
 * байж, "Чат 0" гэдэг нь "чатаар холбоос тараагаагүй эсвэл шошгогүй"
 * гэсэн мэдээлэл болно. Тухай бүрд ашиглагддаг сувгууд (QR, и-мэйл,
 * хэвлэмэл, Google сурталчилгаа) зөвхөн бодит хандалттай үед гарна —
 * эс тэгвэл хүснэгт дэмий уртсана.
 *
 * ⚠️ Хэрэглэгчийн тоог НЭМЖ БОЛОХГҮЙ гэж бодож магадгүй — гэвч GA4 нь
 * мөр бүрт тухайн сувгийн хэрэглэгчийг өгдөг тул нэг хүн хоёр сувгаар
 * орсон бол хоёуланд нь тоологдоно. Facebook-ийн 4 домэйнийг нэгтгэхэд
 * энэ давхардал үлдэнэ — тиймээс хүснэгтэд СЕШН-ийг гол болгоно.
 */
export function classifyTraffic(
  rows: TrafficSourceRow[],
  opts: { includeEmpty?: boolean } = {},
): ClassifiedTraffic[] {
  const acc = new Map<TrafficKey, { sessions: number; users: number }>();

  for (const r of rows) {
    const key = classifyTrafficSource(r.source, r.medium);
    const cur = acc.get(key) ?? { sessions: 0, users: 0 };
    cur.sessions += r.sessions;
    cur.users += r.users;
    acc.set(key, cur);
  }

  const keys = TRAFFIC_ORDER.filter((k) => {
    if ((acc.get(k)?.sessions ?? 0) > 0) return true;
    return opts.includeEmpty === true && TRAFFIC_ALWAYS_SHOWN.includes(k);
  });

  return keys.map((k) => ({
    key: k,
    label: TRAFFIC_LABEL[k],
    sessions: acc.get(k)?.sessions ?? 0,
    users: acc.get(k)?.users ?? 0,
  }));
}
