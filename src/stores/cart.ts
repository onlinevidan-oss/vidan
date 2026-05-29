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

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
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
      totalCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalAmount: () =>
        get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: "vidan-cart", version: 2 },
  ),
);
