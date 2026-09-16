"use client";

import { Suspense, useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GOOGLE_ANALYTICS_ID, NO_TRACK_KEY } from "@/lib/analytics";
import { AnalyticsConsent } from "@/components/analytics/AnalyticsConsent";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: query ? `${pathname}?${query}` : pathname,
    });
  }, [pathname, query]);
  return null;
}

// ============================================================
// Дотоод хандалтыг хэмжихгүй
//
// АСУУДАЛ (2026-09-16): GA4-ийн код root layout дээр сууж байсан тул
// `/admin/*` хуудсанд ч ажиллаж, эзний өөрийн ажил зочны трафик болж
// тоологдож байв. "Шууд орсон" 103 сешнээс 19-аас доошгүй нь
// backoffice дахь ажил байсан. Улмаар хөрвөлтийн хувь бодитоос БАГА
// харагдана — хуваарь нь хөөрөгдсөн.
//
// Хоёр шат:
//   1. `/admin/*` дээр GA огт ачаалахгүй
//   2. Админд нэг удаа орсон браузер бүхэлдээ хэмжигдэхгүй болно
//      (StaffNoTrack) — эзэн дэлгүүрээ шалгахад ч трафик нэмэгдэхгүй
//
// Буцаах: дэлгүүрийн хаягт `?track=1` нэмнэ.
//
// useSyncExternalStore ашигласан шалтгаан: серверт localStorage
// байхгүй. Серверийн хариу "хэмжихгүй" байж, hydration-ий дараа
// браузерийн жинхэнэ утга руу шилжинэ — ингэснээр hydration зөрөхгүй.
// ============================================================

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(NO_TRACK_KEY) !== "1";
  } catch {
    // Нууцлалын горим, хаалттай сан — хэмжилт нь шалтгаан болж
    // хуудас унах ёсгүй.
    return true;
  }
}

/** Серверт үргэлж "хэмжихгүй" — hydration-ий эхний алхам таарна */
function getServerSnapshot(): boolean {
  return false;
}

function allowTrackingAgain(): void {
  try {
    localStorage.removeItem(NO_TRACK_KEY);
  } catch {
    // өнгөрнө
  }
  listeners.forEach((l) => l());
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const allowed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // `?track=1` — ажилтан дэлгүүрээ жинхэнэ зочны нүдээр шалгахад
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get("track") === "1") {
      allowTrackingAgain();
    }
  }, [pathname]);

  // Backoffice — хэмжилтийн зүйл биш
  if (pathname.startsWith("/admin")) return null;
  if (!allowed) return null;

  return (
    <>
      <Script id="google-consent-default" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ANALYTICS_ID}', {
            anonymize_ip: true,
            send_page_view: false
          });
        `}
      </Script>
      <Suspense fallback={null}><PageViewTracker /></Suspense>
      <AnalyticsConsent />
    </>
  );
}
