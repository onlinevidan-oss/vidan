import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { StockMovementForm } from "@/components/admin/StockMovementForm";
import { getFruitProducts, type FruitProduct } from "@/lib/queries/fruit";
import { ubDateKey } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";
import { formatKg, poolUnitsToKg } from "@/lib/fruit-stock";
import { recordFruitPoolMovement, recordFruitStockMovement } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Жимсний агуулах. Сорт бүр кг-ын НӨӨЦТЭЙ (0053): орлого, зарлагыг
 * нөөцөн дээр кг-аар бүртгэнэ; 1кг, 8кг, 12кг зэрэг савлагаа бүгд тэр
 * нөөцөөс зарагдана — доор нь хэдэн ширхэг зарах боломжтойг харуулна.
 */
export default async function FruitInventory() {
  const products = await getFruitProducts();
  const today = ubDateKey();

  const children = new Map<string, FruitProduct[]>();
  for (const p of products) {
    if (!p.stock_source_id) continue;
    children.set(p.stock_source_id, [...(children.get(p.stock_source_id) ?? []), p]);
  }
  const pools = products.filter((p) => p.sku.startsWith("POOL-"));
  const singles = products.filter((p) => !p.stock_source_id && !p.sku.startsWith("POOL-"));
  const totalKg = pools.reduce((s, p) => s + poolUnitsToKg(p.stock), 0);

  return (
    <>
      <FruitTopBar title="Агуулах" crumb={`нийт ${formatKg(totalKg)}`} />
      <div className="flex-1 space-y-4 p-4 sm:p-7">
        {pools.map((pool) => {
          const kg = poolUnitsToKg(pool.stock);
          const kids = (children.get(pool.id) ?? []).sort((a, b) => a.stock_unit_qty - b.stock_unit_qty);
          return (
            <div key={pool.id} className="rounded-2xl border border-ink-200 bg-white">
              <div className="flex flex-wrap items-center gap-4 border-b border-ink-100 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink-900">
                    {pool.name_mn.replace(/^Нөөц · /, "").replace(/ \(0\.5кг нэгж\)$/, "")}
                  </div>
                  <div className="text-xs text-ink-500">Кг-ын нөөц · {pool.sku}</div>
                </div>
                <div className={`text-right font-display text-2xl font-extrabold ${kg > 0 ? "text-ink-900" : "text-brand-600"}`}>
                  {formatKg(kg)}
                </div>
                <StockMovementForm
                  productId={pool.id}
                  productName={pool.name_mn}
                  currentStock={kg}
                  today={today}
                  unit="кг"
                  action={recordFruitPoolMovement}
                />
              </div>
              <div className="divide-y divide-ink-100">
                {kids.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream-100">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span>🍎</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink-900">{p.name_mn}</div>
                      <div className="text-xs text-ink-500">
                        {p.sku} · {formatMnt(p.price)} · {p.is_active ? "дэлгүүрт" : "идэвхгүй"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-ink-500">
                      зарах боломжтой
                      <div className={`font-display text-base font-extrabold ${p.stock > 0 ? "text-ink-900" : "text-brand-600"}`}>
                        {p.stock} ш
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {singles.length > 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-100 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-500">
              Бусад бараа
            </div>
            <div className="divide-y divide-ink-100">
              {singles.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
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
          </div>
        )}

        {products.length === 0 && (
          <div className="rounded-2xl border border-ink-200 bg-white py-12 text-center text-sm text-ink-500">
            Жимсний бараа хараахан нэмэгдээгүй байна
          </div>
        )}
      </div>
    </>
  );
}
