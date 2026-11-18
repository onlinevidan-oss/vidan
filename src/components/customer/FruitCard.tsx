"use client";

import { useState } from "react";
import Image from "next/image";
import { formatMnt } from "@/lib/utils";
import type { FruitProduct } from "@/lib/fruit-preview";

/**
 * Vidan fruit — барааны карт (ЗАГВАР). Савлагааны сонголтоор үнэ солигдоно.
 * Сагслах товч идэвхгүй — захиалгын урсгал шийдэгдээгүй.
 */
export function FruitCard({ product: p }: { product: FruitProduct }) {
  const [selected, setSelected] = useState(0);
  const option = p.options[selected];
  const title = p.variety ?? `${p.origin} алим`;

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-cream-100 sm:aspect-square">
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
              <span className="tabular-nums">{formatMnt(o.price)}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <div className="mb-2">
            <div className="font-display text-[17px] font-extrabold leading-tight text-ink-900">
              {formatMnt(option.price)}
            </div>
            <div className="text-[11px] text-ink-500">{option.note ?? option.label}</div>
          </div>
          <button
            disabled
            title="Захиалга удахгүй нээгдэнэ"
            className="h-[38px] w-full cursor-not-allowed rounded-[10px] bg-brand-600/60 text-[13px] font-extrabold text-white"
          >
            Захиалга удахгүй нээгдэнэ
          </button>
        </div>
      </div>
    </div>
  );
}
