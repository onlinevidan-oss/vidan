"use client";

import Link from "next/link";
import { formatMnt } from "@/lib/utils";
import { getProductMeta, getProductTag } from "@/lib/product-meta";
import { useCart } from "@/stores/cart";
import type { Database } from "@/lib/supabase/database.types";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"] & {
  category?: { name_mn: string | null; slug: string } | null;
};

const TAG_STYLES = {
  discount: "bg-brand-600 text-white",
  new: "bg-lime-600 text-ink-900",
  bio: "bg-ink-900 text-lime-500",
} as const;

export function ProductCard({ product }: { product: ProductRow }) {
  const meta = getProductMeta(product.sku);
  const { tag, tagText } = getProductTag(product);
  const addItem = useCart((s) => s.addItem);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      sku: product.sku,
      name: product.name_mn,
      price: product.price,
    });
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-transparent bg-white transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-brand-lg)]"
    >
      <div
        className={`relative grid aspect-square place-items-center text-[80px] ${meta.bg}`}
      >
        {meta.emoji}
        {tag && (
          <span
            className={`absolute left-2.5 top-2.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${TAG_STYLES[tag]}`}
          >
            {tagText}
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2.5 top-2.5 grid h-[34px] w-[34px] place-items-center rounded-full bg-white/90 backdrop-blur transition hover:bg-brand-100 hover:text-brand-600"
        >
          ♡
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
          {product.category?.name_mn ?? "—"}
        </div>
        <h3 className="mt-1 mb-2 min-h-[38px] text-sm font-semibold text-ink-900">
          {product.name_mn}
        </h3>
        <div className="mb-3 flex items-center gap-1.5 text-xs text-ink-500">
          <span className="text-[#f5b942]">★</span> 4.8{" "}
          <span className="h-[3px] w-[3px] rounded-full bg-ink-300" />
          150+ үнэлгээ
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="font-display text-[17px] font-extrabold text-ink-900">
            {formatMnt(product.price)}
            {product.old_price && product.old_price > product.price && (
              <span className="ml-1 text-xs font-medium text-ink-500 line-through">
                {formatMnt(product.old_price)}
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-brand-600 text-xl font-bold text-white transition hover:scale-105 hover:bg-brand-700"
            title="Сагсанд нэмэх"
          >
            +
          </button>
        </div>
      </div>
    </Link>
  );
}
