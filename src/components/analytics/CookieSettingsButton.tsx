"use client";

import { COOKIE_SETTINGS_EVENT } from "@/lib/analytics";

/**
 * Хөлийн "Cookie тохиргоо" — хэмжилтээс татгалзах цорын ганц газар.
 * Анхны мэдэгдэл товчгүй, 2 секунд харагдаад алга болдог тул тэнд
 * амласан "хэдийд ч татгалзаж болно" гэдэг нь энэ товчоор биелнэ.
 */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
      className="text-left transition hover:text-lime-500"
    >
      Cookie тохиргоо
    </button>
  );
}
