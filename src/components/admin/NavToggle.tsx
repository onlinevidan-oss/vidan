"use client";

import { NAV_TOGGLE_EVENT } from "@/components/admin/Sidebar";

/** Жижиг дэлгэцэд зүүн цэсийг нээх ☰ товч (өргөн дэлгэцэд харагдахгүй) */
export function NavToggle() {
  return (
    <button
      type="button"
      aria-label="Цэс"
      onClick={() => window.dispatchEvent(new Event(NAV_TOGGLE_EVENT))}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-lg text-ink-900 transition hover:bg-ink-100 md:hidden"
    >
      ☰
    </button>
  );
}
