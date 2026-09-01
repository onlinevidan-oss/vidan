"use client";

/**
 * Сагсны товч — тоо нь localStorage-оос ирдэг.
 *
 * Сервер дээр сагс ҮРГЭЛЖ хоосон (localStorage байхгүй) тул тоог шууд
 * зурвал сервер/браузерын HTML зөрж, React бүх хуудсыг дахин зурдаг
 * (hydration mismatch). Тиймээс тоог зөвхөн mount хийсний ДАРАА үзүүлнэ.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/stores/cart";

export function CartButton() {
  const count = useCart((s) => s.totalCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/cart"
      title="Сагс"
      className="relative grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-lg transition hover:bg-lime-100"
    >
      🛒
      {mounted && count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white">
          {count}
        </span>
      )}
    </Link>
  );
}
