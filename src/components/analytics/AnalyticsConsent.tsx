"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "vidan-analytics-consent";

function updateConsent(granted: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "granted" || saved === "denied") updateConsent(saved === "granted");
    else {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function choose(granted: boolean) {
    localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
    updateConsent(granted);
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <aside aria-label="Cookie зөвшөөрөл" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-ink-200 bg-white p-5 shadow-[var(--shadow-brand-lg)]">
      <p className="text-sm leading-relaxed text-ink-700">
        Бид сайтын хэрэглээг ойлгож, үйлчилгээг сайжруулахын тулд Google Analytics cookie ашигладаг. Хувийн мэдээллийг Analytics руу илгээхгүй. <Link href="/privacy" className="font-bold text-brand-600 underline">Дэлгэрэнгүй</Link>
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => choose(false)} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-bold text-ink-700">Татгалзах</button>
        <button type="button" onClick={() => choose(true)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">Зөвшөөрөх</button>
      </div>
    </aside>
  );
}
