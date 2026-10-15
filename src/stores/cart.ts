"use client";

/**
 * Сагсны Zustand store
 * - Browser localStorage-д persist хийнэ
 * - Phase 6-д Supabase-тэй sync хийнэ (нэвтэрсэн хэрэглэгчид)
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

/** Сангаас уншсан барааны одоогийн үнэ, нэр */
export type FreshPrice = { productId: string; price: number; name: string };

/**
 * Сагсанд хадгалагдсан үнийг сангийн одоогийн үнээр солино.
 *
 * Сагс нь бараа нэмсэн үеийн үнийг localStorage-д хадгалдаг тул үнэ
 * өөрчлөгдсөний дараа хуучин дүн харагдана. Гэтэл place_order нь сангийн
 * үнээр бодно — хэрэглэгч сагсанд нэг дүн хараад QPay-д өөр дүн төлөх
 * байв (2026-10-15: 4,320 гэж харагдсан бараа 4,800 байсан).
 * Сангаас олдоогүй бараа (идэвхгүй) хэвээр үлдэнэ — place_order татгалзана.
 */
export function applyFreshPrices(
  items: CartItem[],
  fresh: FreshPrice[],
): { items: CartItem[]; changed: number } {
  const byId = new Map(fresh.map((f) => [f.productId, f]));
  let changed = 0;
  let touched = false;
  const next = items.map((i) => {
    const f = byId.get(i.productId);
    if (!f || (f.price === i.price && f.name === i.name)) return i;
    touched = true;
    if (f.price !== i.price) changed++;
    return { ...i, price: f.price, name: f.name };
  });
  return { items: touched ? next : items, changed };
}

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
  /** Сангийн одоогийн үнээр шинэчилнэ; үнэ нь өөрчлөгдсөн барааны тоог буцаана */
  syncPrices: (fresh: FreshPrice[]) => number;
  totalCount: () => number;
  totalAmount: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? {
                      ...i,
                      quantity: i.quantity + qty,
                      // Шинэ image, slug ирвэл шинэчилнэ
                      imageUrl: item.imageUrl ?? i.imageUrl,
                      slug: item.slug ?? i.slug,
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      setQuantity: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: qty } : i,
                ),
        })),
      clear: () => set({ items: [] }),
      syncPrices: (fresh) => {
        const { items, changed } = applyFreshPrices(get().items, fresh);
        if (items !== get().items) set({ items });
        return changed;
      },
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: "vidan-cart", version: 2 },
  ),
);
