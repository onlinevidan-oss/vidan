"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FRUIT_BRAND, FRUIT_PREVIEW, FRUIT_TOAST_KEY } from "@/lib/fruit-preview";

/** Мэдэгдэл харагдах хугацаа */
const TOAST_MS = 2500;

/**
 * Vidan fruit — нэвтэрсэн хэрэглэгчид нэг удаа гарах мэдэгдэл (ЗАГВАР).
 * Туггүй орчинд юу ч рендерлэхгүй. Загварыг үзүүлэхэд `?fruit-toast=1`
 * нэмбэл дахин гарна. `demoOnly` — нэвтрээгүй үед зөвхөн тэр параметрээр.
 */
export function FruitToast({ demoOnly = false }: { demoOnly?: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!FRUIT_PREVIEW) return;
    const forced = new URL(window.location.href).searchParams.get("fruit-toast") === "1";
    if (demoOnly && !forced) return;
    try {
      if (!forced && localStorage.getItem(FRUIT_TOAST_KEY) === "1") return;
    } catch {
      // Сан хаалттай — мэдэгдэл заавал биш, гаргахгүй
      if (!forced) return;
    }
    // "Үзсэн" тэмдгийг харуулах үед л тавина: effect дахин ажиллавал
    // (dev-ийн StrictMode) өмнөх timer цуцлагдаж, тэмдэг тавигдаагүй үлдэнэ.
    const open = setTimeout(() => {
      setShow(true);
      try {
        localStorage.setItem(FRUIT_TOAST_KEY, "1");
      } catch {
        // өнгөрнө
      }
    }, 400);
    const close = setTimeout(() => setShow(false), 400 + TOAST_MS);
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, [demoOnly]);

  if (!FRUIT_PREVIEW) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 top-24 z-[60] mx-auto max-w-[420px] transition duration-300 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <Link
        href={`/brands/${FRUIT_BRAND.slug}`}
        className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-brand-lg)] ring-1 ring-ink-200"
      >
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-2xl">
          🍎
        </span>
        <span className="text-sm leading-snug text-ink-900">
          <b className="font-extrabold">{FRUIT_BRAND.name} цэс нэмэгдлээ!</b>
          <br />
          Шинэхэн жимсээ хайрцгаар нь захиалаад гэртээ хүргүүлээрэй.
        </span>
      </Link>
    </div>
  );
}
