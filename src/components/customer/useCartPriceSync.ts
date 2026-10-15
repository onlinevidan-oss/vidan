"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/stores/cart";
import { createClient } from "@/lib/supabase/client";

/**
 * Сагс, захиалгын хуудас нээгдэхэд сагсны үнийг сангаас шинэчилнэ
 * (applyFreshPrices-ийн тайлбарыг үз). `ready` нь шинэчлэл дуусахаас өмнө
 * захиалга илгээхээс сэргийлэхэд, `changed` нь хэрэглэгчид мэдэгдэхэд.
 */
export function useCartPriceSync() {
  const ids = useCart((s) => s.items.map((i) => i.productId).sort().join(","));
  const syncPrices = useCart((s) => s.syncPrices);
  // Аль id-нуудын үнийг шалгаж дууссаныг тэмдэглэнэ — сагсны бүрэлдэхүүн
  // өөрчлөгдвөл (бараа нэмэх/хасах) дахин шалгана.
  const [syncedIds, setSyncedIds] = useState<string | null>(null);
  const [changed, setChanged] = useState(0);

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    createClient()
      .from("products")
      .select("id, price, name_mn")
      .in("id", ids.split(","))
      .then(({ data, error }) => {
        if (cancelled) return;
        // Сүлжээний алдаа гарвал захиалгыг хаахгүй — place_order сангийн үнээр бодно
        if (!error && data) {
          const n = syncPrices(
            data.map((p) => ({ productId: p.id, price: Number(p.price), name: p.name_mn })),
          );
          if (n > 0) setChanged((c) => c + n);
        }
        setSyncedIds(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, syncPrices]);

  return { ready: !ids || syncedIds === ids, changed };
}
