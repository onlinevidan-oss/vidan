"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GOOGLE_ANALYTICS_ID } from "@/lib/analytics";
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

export function GoogleAnalytics() {
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
