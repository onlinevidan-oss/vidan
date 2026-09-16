/**
 * GA4 Measurement Protocol — сервер талаас эвент илгээх.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: `purchase` эвент урьд нь зөвхөн /checkout/success
 * хуудас ачаалагдвал бичигддэг байв. Трафикийн 90% нь гар утас — банкны
 * апп руу үсэрч төлбөрөө хийгээд браузерт буцаж ирэхгүй хүн огт
 * тоологдохгүй өнгөрдөг. 2026-09-16-ны байдлаар GA4 дээр 4 худалдан
 * авалт харагдаж байхад өгөгдлийн санд 11 байв.
 *
 * Тохиргоо:
 *   NEXT_PUBLIC_GOOGLE_ANALYTICS_ID — G-XXXXXXXXXX (аль хэдийн байгаа)
 *   GA4_MP_API_SECRET               — GA4 Admin → Data Streams →
 *                                     Measurement Protocol API secrets
 *
 * ⚠️ GA4_MP_API_SECRET тохируулаагүй бол чимээгүй алгасна. Хэмжилтийн
 *    алдаа худалдан авалтыг хэзээ ч тасалдуулж болохгүй.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GOOGLE_ANALYTICS_ID } from "@/lib/analytics";

const ENDPOINT = "https://www.google-analytics.com/mp/collect";

export function isGa4MpConfigured(): boolean {
  return !!process.env.GA4_MP_API_SECRET?.trim() && !!GOOGLE_ANALYTICS_ID;
}

/**
 * `_ga` күүкиэс client_id-г салгана.
 * Хэлбэр: `GA1.1.1234567890.1234567890` → `1234567890.1234567890`
 */
export function parseGaClientId(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length < 4) return null;
  const id = `${parts[2]}.${parts[3]}`;
  return /^\d+\.\d+$/.test(id) ? id : null;
}

/**
 * Захиалга төлөгдсөнийг GA4-д сервер талаас мэдэгдэнэ.
 * Idempotent биш — `verifyAndMarkPaid` өөрөө нэг л удаа дуудна
 * (`mark_order_paid` амжилттай болсны дараа).
 */
export async function sendPurchaseEvent(orderId: string): Promise<void> {
  if (!isGa4MpConfigured()) return;

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "order_number, total, shipping, tax, discount, promo_code, ga_client_id, order_items(quantity, unit_price, product:products(sku, name_mn))",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;

  // client_id байхгүй бол эвентийг session-тэй холбож чадахгүй. GA4 нь
  // client_id-г заавал шаарддаг тул зохиомол утга өгвөл тусдаа "хэрэглэгч"
  // болж, тоо гуйвуулна. Тийм тохиолдолд илгээхгүй нь дээр.
  if (!order.ga_client_id) return;

  const items = (order.order_items ?? []).map((oi) => {
    const p = Array.isArray(oi.product) ? oi.product[0] : oi.product;
    return {
      item_id: p?.sku ?? "",
      item_name: p?.name_mn ?? "",
      price: Number(oi.unit_price),
      quantity: oi.quantity,
    };
  });

  const body = {
    client_id: order.ga_client_id,
    // Сервер талаас илгээхэд GA4 өөрөө цагийг нь тавьдаг.
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: order.order_number,
          currency: "MNT",
          value: Number(order.total),
          shipping: Number(order.shipping) + Number(order.tax),
          ...(order.promo_code ? { coupon: order.promo_code } : {}),
          items,
        },
      },
    ],
  };

  const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(
    GOOGLE_ANALYTICS_ID,
  )}&api_secret=${encodeURIComponent(process.env.GA4_MP_API_SECRET!.trim())}`;

  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
    // GA4 амжилттай үед 204 буцаана, алдааг биеэрээ мэдэгддэггүй.
    if (!res.ok) {
      console.error(`[ga4-mp] purchase илгээж чадсангүй (${res.status})`);
    }
  } catch (e) {
    console.error("[ga4-mp] purchase илгээхэд алдаа", e);
  }
}
