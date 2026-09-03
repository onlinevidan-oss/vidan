export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-TKW8J2C1LH";

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
