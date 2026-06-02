"use client";

import { useState } from "react";
import { useCart } from "@/stores/cart";

export function AddToCartBlock({
  product,
}: {
  product: {
    id: string;
    sku: string;
    slug: string;
    name: string;
    price: number;
    inStock: boolean;
    imageUrl?: string | null;
  };
}) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const addItem = useCart((s) => s.addItem);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl ?? null,
      },
      qty,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  }

  if (!product.inStock) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-[12px] bg-ink-200 px-5 py-2.5 text-sm font-extrabold text-ink-500"
      >
        Хэсэг хугацааны дараа дахин шалга
      </button>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Quantity */}
      <div className="flex items-center overflow-hidden rounded-[12px] border-[1.5px] border-ink-200 bg-white">
        <button
          type="button"
          onClick={() => setQty(Math.max(1, qty - 1))}
          className="grid h-10 w-10 place-items-center bg-ink-100 text-base font-bold text-ink-700 transition hover:bg-ink-200 hover:text-brand-700"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className="font-display h-10 w-12 border-0 bg-white text-center text-sm font-bold outline-none"
        />
        <button
          type="button"
          onClick={() => setQty(qty + 1)}
          className="grid h-10 w-10 place-items-center bg-ink-100 text-base font-bold text-ink-700 transition hover:bg-ink-200 hover:text-brand-700"
        >
          ＋
        </button>
      </div>

      {/* Add */}
      <button
        onClick={handleAdd}
        className={
          justAdded
            ? "flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-lime-600 px-5 py-2.5 text-sm font-extrabold text-ink-900 transition"
            : "flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700"
        }
      >
        {justAdded ? (
          <>✓ Нэмэгдлээ</>
        ) : (
          <>🛒 Сагсанд нэмэх</>
        )}
      </button>
    </div>
  );
}
