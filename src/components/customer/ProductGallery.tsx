"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  tag,
  tagText,
}: {
  images: { url: string; alt: string }[];
  tag?: "discount" | "new" | "bio" | null;
  tagText?: string | null;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-[20px] bg-cream-100">
        <Image
          src={current.url}
          alt={current.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
        />
        {tag && tagText && (
          <span
            className={`absolute left-5 top-5 rounded-lg px-3 py-1.5 text-xs font-extrabold tracking-wide ${
              tag === "discount"
                ? "bg-brand-600 text-white"
                : tag === "new"
                  ? "bg-lime-600 text-ink-900"
                  : "bg-ink-900 text-lime-500"
            }`}
          >
            {tagText}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden rounded-lg border-[2px] bg-cream-100 transition ${
                i === active
                  ? "border-brand-500 ring-2 ring-brand-100"
                  : "border-transparent hover:border-brand-200"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
