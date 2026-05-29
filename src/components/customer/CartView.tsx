"use client";

import Link from "next/link";
import { useCart } from "@/stores/cart";
import { formatMnt } from "@/lib/utils";
import { getProductMeta } from "@/lib/product-meta";

const FREE_SHIPPING_MIN = 50000;
const TAX_RATE = 0.1;

export function CartView() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.totalAmount());
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);

  if (items.length === 0) {
    return (
      <div className="my-12 grid place-items-center">
        <div className="max-w-[400px] rounded-2xl border-[1.5px] border-dashed border-ink-200 bg-white p-12 text-center">
          <div className="mb-4 text-6xl">🛒</div>
          <h2 className="font-display mb-3 text-xl font-extrabold tracking-tight text-ink-900">
            Сагс хоосон байна
          </h2>
          <p className="mb-6 text-sm text-ink-700">
            Бүтээгдэхүүн нэмж сагсаа дүүргэе.
          </p>
          <Link
            href="/products"
            className="inline-block rounded-[10px] bg-brand-600 px-6 py-3 font-bold text-white transition hover:bg-brand-700"
          >
            🛍️ Бараа үзэх
          </Link>
        </div>
      </div>
    );
  }

  const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : 5000;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal - 0 + shipping + tax;
  const freeShipNeeded = Math.max(0, FREE_SHIPPING_MIN - subtotal);

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">Нүүр</Link>
        <span>/</span>
        <span className="text-ink-700">Сагс</span>
      </nav>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
          Сагс
        </h1>
        <button
          onClick={clear}
          className="text-xs font-bold text-ink-500 underline transition hover:text-brand-700"
        >
          Сагс хоослох
        </button>
      </div>

      {freeShipNeeded > 0 && (
        <div className="mb-5 rounded-xl border border-lime-300 bg-lime-50 p-4 text-sm text-ink-700">
          🚚 <strong className="text-lime-700">Ахиад {formatMnt(freeShipNeeded)}</strong>{" "}
          захиалбал хүргэлт <strong>үнэгүй</strong> болно!
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const meta = getProductMeta(item.sku);
            return (
              <div
                key={item.productId}
                className="flex gap-4 rounded-2xl border border-ink-200 bg-white p-4"
              >
                <div
                  className={`grid h-24 w-24 shrink-0 place-items-center rounded-xl text-4xl ${meta.bg}`}
                >
                  {meta.emoji}
                </div>
                <div className="flex flex-1 flex-col">
                  <Link
                    href={`/products/${item.sku.toLowerCase()}`}
                    className="font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-0.5 font-display text-[15px] font-bold text-ink-900">
                    {formatMnt(item.price)}
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border-[1.5px] border-ink-200">
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        className="grid h-8 w-8 place-items-center bg-ink-100 text-base font-bold text-ink-700 hover:bg-ink-200"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          setQuantity(item.productId, Math.max(1, Number(e.target.value) || 1))
                        }
                        className="font-display h-8 w-12 border-0 bg-white text-center text-sm font-bold outline-none"
                      />
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        className="grid h-8 w-8 place-items-center bg-ink-100 text-base font-bold text-ink-700 hover:bg-ink-200"
                      >
                        ＋
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-xs font-bold text-brand-600 underline-offset-2 transition hover:underline"
                    >
                      Хасах
                    </button>
                  </div>
                </div>
                <div className="font-display self-center text-right text-base font-extrabold text-ink-900">
                  {formatMnt(item.price * item.quantity)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="space-y-4">
          <div className="sticky top-24 rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-4 text-base font-extrabold tracking-tight text-ink-900">
              Захиалгын дүн
            </h3>
            <Row label={`Дэд дүн (${items.length} бараа)`} value={formatMnt(subtotal)} />
            <Row
              label="Хүргэлт"
              value={shipping === 0 ? "Үнэгүй" : formatMnt(shipping)}
              accent={shipping === 0 ? "success" : undefined}
            />
            <Row label="НӨАТ (10%)" value={formatMnt(tax)} />
            <div className="my-3 h-px bg-ink-100" />
            <div className="mb-5 flex items-baseline justify-between">
              <div className="text-sm font-bold text-ink-900">Нийт төлөх</div>
              <div className="font-display text-2xl font-black text-brand-700">
                {formatMnt(total)}
              </div>
            </div>
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center rounded-[12px] bg-brand-600 py-4 text-base font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              Захиалга өгөх →
            </Link>
            <Link
              href="/products"
              className="mt-2 block text-center text-xs font-bold text-ink-500 underline-offset-2 transition hover:text-brand-700 hover:underline"
            >
              ← Худалдан авалт үргэлжлүүлэх
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success";
}) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span
        className={
          accent === "success"
            ? "font-semibold text-[#2da764]"
            : "font-semibold text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
