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

/**
 * Энэ браузерын худалдан авалтыг хэмжиж болох уу.
 *
 * Сервер талаас GA4-д `purchase` илгээхийн өмнө үүнийг шалгана. Сервер
 * өөрөө localStorage-ыг харж чадахгүй тул браузер захиалга илгээхдээ
 * хариуг нь дамжуулна.
 *
 * Хоёр нөхцөл хоёулаа биелэх ёстой:
 *   · хэрэглэгч күүкийн санамж дээр "Зөвшөөрөх" дарсан
 *   · ажилтны браузер биш (туршилтын захиалга борлуулалтыг гуйвуулна)
 *
 * ⚠️ `_ga` күүки байгаа эсэхээр шийдэж БОЛОХГҮЙ: хэрэглэгч эхлээд
 * зөвшөөрөөд дараа нь татгалзсан бол күүки нь үлддэг.
 */
export function canMeasurePurchase(): boolean {
  try {
    return (
      localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted" &&
      localStorage.getItem(NO_TRACK_KEY) !== "1"
    );
  } catch {
    // Сан хаалттай бол зөвшөөрөл авсан гэж үзэх үндэсгүй
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
