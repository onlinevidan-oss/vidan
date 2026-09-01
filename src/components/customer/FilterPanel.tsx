"use client";

/**
 * Бүтээгдэхүүний шүүлтүүр.
 *
 * Гар утсанд шүүлтүүр (брэнд, ангилал, шүүлтүүр) бүтээгдэхүүнээс дээр
 * бүтнээрээ харагдаж, хэрэглэгч бараагаа хартал урт гүйлгэдэг байсан.
 * Одоо утсанд эвхээстэй — "Шүүлтүүр" дээр дарж нээнэ. Desktop дээр
 * хажуугийн багана хэвээр.
 */

import { useState } from "react";

export function FilterPanel({
  activeCount,
  children,
}: {
  /** Идэвхтэй шүүлтүүрийн тоо — товчин дээр тэмдэглэнэ */
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="space-y-3 lg:space-y-5">
      {/* Гар утасны товч */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-900 transition hover:border-brand-200 lg:hidden"
      >
        <span className="flex items-center gap-2">
          ⚙️ Шүүлтүүр
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-extrabold text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span
          className={`text-ink-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      <div className={`space-y-5 ${open ? "" : "hidden"} lg:block`}>
        {children}
      </div>
    </aside>
  );
}
