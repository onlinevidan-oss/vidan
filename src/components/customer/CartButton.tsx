"use client";

/**
 * Сагсны товч — тоо нь localStorage-оос ирдэг.
 *
 * Сервер дээр сагс ҮРГЭЛЖ хоосон (localStorage байхгүй) тул тоог шууд
 * зурвал сервер/браузерын HTML зөрөх эрсдэлтэй. Тиймээс тоог зөвхөн
 * браузер дээр зурна.
 *
 * useSyncExternalStore нь энэ зорилгод React-ийн албан ёсны арга:
 * server snapshot = false, client snapshot = true.
 */

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { CART_TARGET_ATTR } from "@/lib/fly-to-cart";

const noopSubscribe = () => () => {};

export function CartButton() {
  const count = useCart((s) => s.totalCount());
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  return (
    <Link
      href="/cart"
      title="Сагс"
      // Сагс руу нисэх хөдөлгөөн энэ тэмдгээр байг олно (fly-to-cart.ts)
      {...{ [CART_TARGET_ATTR]: "" }}
      className="relative grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-lg transition hover:bg-lime-100"
    >
      🛒
      {isClient && count > 0 && (
        <span
          // `key` нь тоо өөрчлөгдөх бүрд элементийг шинэчилж, pop
          // анимацийг дахин ажиллуулна — нисэж ирсэн бараа энд "бууна"
          key={count}
          className="absolute -right-1 -top-1 min-w-[20px] animate-[pop_.3s_ease] rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
