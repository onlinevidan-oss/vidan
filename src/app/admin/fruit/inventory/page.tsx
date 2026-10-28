import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { StockMovementForm } from "@/components/admin/StockMovementForm";
import { getFruitProducts } from "@/lib/queries/fruit";
import { ubDateKey } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";
import { recordFruitStockMovement } from "../actions";

export const dynamic = "force-dynamic";

/** Жимсний агуулах — зөвхөн Vidan fruit брэндийн бараа */
export default async function FruitInventory() {
  const products = await getFruitProducts();
  const today = ubDateKey();
  const total = products.reduce((s, p) => s + p.stock, 0);

  return (
    <>
      <FruitTopBar title="Агуулах" crumb={`${total} ширхэг`} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="rounded-2xl border border-ink-200 bg-white">
          {products.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">Жимсний бараа хараахан нэмэгдээгүй байна</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {products.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream-100">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-lg">🍎</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink-900">{p.name_mn}</div>
                    <div className="text-xs text-ink-500">
                      {p.sku} · {formatMnt(p.price)} · {p.is_active ? "дэлгүүрт" : "идэвхгүй"}
                    </div>
                  </div>
                  <div className="w-20 text-right font-display text-lg font-extrabold text-ink-900">{p.stock} ш</div>
                  <StockMovementForm
                    productId={p.id}
                    productName={p.name_mn}
                    currentStock={p.stock}
                    today={today}
                    action={recordFruitStockMovement}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
