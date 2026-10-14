/**
 * Идэвхтэй барааны үлдэгдлийн тоо — "дуусч буй" ба "дууссан".
 * Хяналтын самбар, хонх, барааны жагсаалт гурвуулаа ЭНИЙГ дуудна —
 * дүрэм нь `stockLevel`-тэй (агуулах, тайлан) яг ижил.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { LOW_STOCK_LIMIT } from "@/lib/stock-level";

export const getStockCounts = cache(
  async (): Promise<{ low: number; out: number }> => {
    const supabase = await createClient();
    const active = () =>
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
    const [low, out] = await Promise.all([
      active().gt("stock", 0).lte("stock", LOW_STOCK_LIMIT),
      active().lte("stock", 0),
    ]);
    return { low: low.count ?? 0, out: out.count ?? 0 };
  },
);
