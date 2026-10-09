export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-TKW8J2C1LH";

/**
 * Энэ браузерийг хэмжихгүй гэсэн тэмдэглэгээ (localStorage).
 * Админд нэг удаа орсон браузерт тавигдана — эзний өөрийн ажил
 * зочны трафик болж тоологдохоос сэргийлнэ.
 */
export const NO_TRACK_KEY = "vidan-no-track";

/** Күүкийн санамж дээрх сонголт (localStorage): "granted" | "denied" */
export const ANALYTICS_CONSENT_KEY = "vidan-analytics-consent";

/** Хөлийн "Cookie тохиргоо" товч дарагдахад цацагдах эвент */
export const COOKIE_SETTINGS_EVENT = "vidan:cookie-settings";

/**
 * Энэ браузерын худалдан авалтыг хэмжиж болох уу.
 *
 * Сервер талаас GA4-д `purchase` илгээхийн өмнө үүнийг шалгана. Сервер
 * өөрөө localStorage-ыг харж чадахгүй тул браузер захиалга илгээхдээ
 * хариуг нь дамжуулна.
 *
 * ЗАГВАР (2026-10-09-нөөс): хэмжилт анхдагчаар ИДЭВХТЭЙ, хэрэглэгч
 * мэдэгдлээс "Татгалзах" дарж зогсооно. Өмнө нь эсрэгээрээ — зөвшөөрсөн
 * хүнийг л хэмждэг байсан ба худалдан авагчдын тал нь (10-аас 5)
 * хэмжигдэхгүй өнгөрч байв.
 *
 * Хэмжихгүй хоёр тохиолдол:
 *   · хэрэглэгч "Татгалзах" дарсан
 *   · ажилтны браузер (туршилтын захиалга борлуулалтыг гуйвуулна)
 */
export function canMeasurePurchase(): boolean {
  try {
    return (
      localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "denied" &&
      localStorage.getItem(NO_TRACK_KEY) !== "1"
    );
  } catch {
    // Сан хаалттай бол татгалзсан эсэхийг мэдэх аргагүй — болгоомжтой талд
    return false;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => { window.dataLayer.push(args); });
  window.gtag("event", name, params ?? {});
}

export function ecommerceItems(
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>,
): AnalyticsItem[] {
  return items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));
}
