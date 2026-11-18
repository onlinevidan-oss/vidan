"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { formatMnt } from "@/lib/utils";
import { useCart } from "@/stores/cart";
import { flyToCart } from "@/lib/fly-to-cart";
import { trackEvent } from "@/lib/analytics";
import type { FruitProduct } from "@/lib/fruit-preview";

/**
 * "Жимс" — барааны карт. Савлагааны сонголт бүр сангийн тусдаа бараа
 * (0053); сонгосноо сагсална. Үлдэгдэлгүй сонголт "Дууссан".
 */
export function FruitCard({ product: p }: { product: FruitProduct }) {
  // Анхдагч сонголт — үлдэгдэлтэй эхнийх
  const [selected, setSelected] = useState(() => Math.max(0, p.options.findIndex((o) => o.stock > 0)));
  const option = p.options[selected];
  const title = p.variety ?? `${p.origin} алим`;
  const imageRef = useRef<HTMLDivElement | null>(null);
  const addItem = useCart((s) => s.addItem);
  const inCart = useCart((s) => s.items.find((i) => i.productId === option.productId)?.quantity ?? 0);
  const soldOut = option.stock <= 0;
  const atLimit = inCart >= option.stock;

  function add() {
    if (soldOut || atLimit) return;
    flyToCart(imageRef.current);
    addItem({
      productId: option.productId,
      sku: option.sku,
      slug: option.slug,
      name: option.name,
      price: option.price,
      imageUrl: p.image,
    });
    trackEvent("add_to_cart", {
      currency: "MNT",
      value: option.price,
      items: [{ item_id: option.productId, item_name: option.name, item_category: "Жимс", price: option.price, quantity: 1 }],
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] bg-white">
      <div ref={imageRef} className="relative aspect-[4/3] overflow-hidden bg-cream-100 sm:aspect-square">
        {p.image ? (
          <Image
            src={p.image}
            alt={`${p.origin} алим ${p.variety ?? ""}`.trim()}
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div aria-hidden className="text-6xl">🍎</div>
              <div className="mt-2 text-xs font-semibold text-ink-500">Зураг удахгүй</div>
            </div>
          </div>
        )}
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-lime-600 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-ink-900">
          ШИНЭХЭН
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {p.variety && (
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
            <span aria-hidden>{p.flag}</span> {p.origin} алим
          </div>
        )}
        <h3 className="mt-1 text-sm font-semibold text-ink-900">
          {!p.variety && <span aria-hidden>{p.flag} </span>}
          {title}
        </h3>

        {/* Савлагааны сонголт */}
        <div role="radiogroup" aria-label="Савлагаа" className="mt-2.5 mb-3 grid gap-1.5">
          {p.options.map((o, i) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={i === selected}
              onClick={() => setSelected(i)}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                i === selected
                  ? "border-brand-600 bg-brand-50 font-bold text-ink-900"
                  : "border-ink-200 text-ink-700 hover:border-ink-300"
              }`}
            >
              <span>{o.label}</span>
              <span className="tabular-nums">
                {o.stock > 0 ? formatMnt(o.price) : <span className="font-semibold text-ink-400">Дууссан</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <div className="mb-2">
            <div className="font-display text-[17px] font-extrabold leading-tight text-ink-900">
              {formatMnt(option.price)}
            </div>
            <div className="text-[11px] text-ink-500">
              {option.label}
              {inCart > 0 && <span className="ml-1 font-bold text-lime-700">· сагсанд {inCart}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={soldOut || atLimit}
            className="h-[38px] w-full rounded-[10px] bg-brand-600 text-[13px] font-extrabold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            {soldOut ? "Дууссан" : atLimit ? "Үлдэгдэл хүрэлцэхгүй" : inCart > 0 ? "Дахин сагслах" : "Сагслах"}
          </button>
        </div>
      </div>
    </div>
  );
}
