"use client";

import { useState, useRef, useEffect } from "react";
import { formatPhone } from "@/lib/utils";

export function UserMenu({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const displayName = (name || phone || "Хэрэглэгч").trim();
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "У";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-ink-100 px-2.5 py-1.5 transition hover:bg-lime-100"
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-lime-500 text-sm font-extrabold text-ink-900">
          {initials}
        </div>
        <span className="hidden md:inline text-sm font-semibold text-ink-900">
          {name || (phone ? formatPhone(phone) : "Профайл")}
        </span>
        <span className="text-xs opacity-50">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-[var(--shadow-brand-lg)]">
          <div className="border-b border-ink-100 p-3">
            <div className="font-bold text-ink-900">{name || "Шинэ хэрэглэгч"}</div>
            {phone && (
              <div className="font-display mt-0.5 text-xs text-ink-500">
                {formatPhone(phone)}
              </div>
            )}
          </div>
          <nav className="flex flex-col p-1.5">
            <a
              href="/account"
              className="rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100 hover:text-brand-700"
            >
              👤 Миний профайл
            </a>
            <a
              href="/orders"
              className="rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100 hover:text-brand-700"
            >
              📦 Захиалгын түүх
            </a>
            <a
              href="/favorites"
              className="rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100 hover:text-brand-700"
            >
              ♡ Дуртай бараа
            </a>
            <a
              href="/addresses"
              className="rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-100 hover:text-brand-700"
            >
              📍 Хаягууд
            </a>
            <div className="my-1 h-px bg-ink-100" />
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                ⎋ Гарах
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}
