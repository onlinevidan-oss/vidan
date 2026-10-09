"use client";

/**
 * Analytics-ийн мэдэгдэл ба тохиргоо.
 *
 * ЗАГВАР (2026-10-09): хэмжилт анхдагчаар идэвхтэй. Зочин анх ороход
 * буланд жижиг мэдэгдэл 2 секунд харагдаад өөрөө алга болно — товчгүй,
 * дарах шаардлагагүй, худалдан авалтад саад болохгүй. Татгалзах хүн
 * хөлийн "Cookie тохиргоо"-оор орж зогсооно.
 *
 * Өмнө нь "Зөвшөөрөх" дарсан хүнийг л хэмждэг том санамж байсан ба
 * худалдан авагчдын тал нь (10-аас 5) хэмжигдэхгүй өнгөрч байв.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_CONSENT_KEY as STORAGE_KEY,
  COOKIE_SETTINGS_EVENT,
} from "@/lib/analytics";

/** Мэдэгдэл харагдах хугацаа */
const TOAST_MS = 2000;

/** Эдгээр хуудсанд мэдэгдэл гарахгүй — дараагийн энгийн хуудсанд гарна */
const QUIET_PATHS = ["/checkout", "/login", "/admin"];

function setMeasuring(on: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: on ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (on) return;
  // Татгалзсан хүний төхөөрөмж дээр танигч үлдэх ёсгүй. Күүки домэйн
  // хоёр хэлбэрээр тавигдсан байж болох тул гурвуулангаар нь арилгана.
  try {
    const host = window.location.hostname;
    const names = document.cookie
      .split(";")
      .map((c) => c.trim().split("=")[0])
      .filter((n) => n === "_ga" || n.startsWith("_ga_"));
    for (const n of names) {
      for (const d of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
        document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
      }
    }
  } catch {
    // күүки арилгаж чадаагүй ч хэмжилт аль хэдийн зогссон
  }
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [toast, setToast] = useState(false);
  const [panel, setPanel] = useState(false);
  const [denied, setDenied] = useState(false);

  // Анхны зочлолтод нэг удаа мэдэгдэнэ
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "denied") {
      setMeasuring(false);
      return;
    }
    if (saved === "granted") return;
    if (QUIET_PATHS.some((p) => pathname.startsWith(p))) return;
    // "Мэдэгдсэн" гэж ХАРУУЛАХ агшинд л тэмдэглэнэ. Эрт тэмдэглэвэл
    // effect дахин ажиллах үед (React-ийн хөгжүүлэлтийн горим) мэдэгдэл
    // огт харагдалгүй "мэдэгдсэн" болж үлдэнэ.
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "granted");
      setToast(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Харагдсанаас 2 секундын дараа алга болно. Тусдаа effect: хуудас
  // солигдсон ч цаг нь тасрахгүй.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Хөлийн "Cookie тохиргоо" товч
  useEffect(() => {
    const open = () => {
      setDenied(localStorage.getItem(STORAGE_KEY) === "denied");
      setToast(false);
      setPanel(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
  }, []);

  function choose(on: boolean) {
    localStorage.setItem(STORAGE_KEY, on ? "granted" : "denied");
    setMeasuring(on);
    setPanel(false);
  }

  if (panel) {
    return (
      <aside
        aria-label="Cookie тохиргоо"
        className="fixed bottom-3 left-3 z-[100] w-[min(300px,calc(100vw-1.5rem))] rounded-xl border border-ink-200 bg-white p-4 shadow-[var(--shadow-brand-lg)]"
      >
        <div className="text-[13px] font-bold text-ink-900">Зочлолтын хэмжилт</div>
        <p className="mt-1 text-[12px] leading-snug text-ink-700">
          Одоо:{" "}
          <strong className={denied ? "text-brand-700" : "text-lime-700"}>
            {denied ? "зогссон" : "идэвхтэй"}
          </strong>
          . Таны нэр, утас, хаяг Google рүү илгээгддэггүй.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => choose(false)}
            className="flex-1 rounded-lg border border-ink-200 py-2 text-[12px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            Татгалзах
          </button>
          <button
            type="button"
            onClick={() => choose(true)}
            className="flex-1 rounded-lg bg-ink-900 py-2 text-[12px] font-bold text-white transition hover:bg-brand-600"
          >
            Зөвшөөрөх
          </button>
        </div>
      </aside>
    );
  }

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      // pointer-events-none: хэзээ ч даралтыг хаахгүй
      className="pointer-events-none fixed bottom-3 left-3 z-[100] max-w-[250px] animate-[pop_.25s_ease] rounded-lg border border-ink-200 bg-white/95 px-3 py-2 text-[11px] leading-snug text-ink-700 shadow-[var(--shadow-brand-lg)] backdrop-blur"
    >
      Бид зочлолтыг Google Analytics-ээр хэмждэг. Та хуудасны доод хэсгийн
      “Cookie тохиргоо”-оос хэдийд ч татгалзаж болно.
    </div>
  );
}
