import Link from "next/link";
import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { OrderCard } from "@/components/admin/OrderCard";
import { getFruitOrders, getFruitProducts, getFruitSales } from "@/lib/queries/fruit";
import { formatKg, poolUnitsToKg } from "@/lib/fruit-stock";
import { summarizeFruitSales } from "@/lib/fruit-report";
import { startOfMonthMongolia } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";
import { markFruitCourierEntered } from "./actions";

export const dynamic = "force-dynamic";

export default async function FruitDashboard() {
  const now = new Date();
  const [products, recent, sales] = await Promise.all([
    getFruitProducts(),
    getFruitOrders({ limit: 5 }),
    getFruitSales({ since: startOfMonthMongolia(now), until: now }),
  ]);
  const month = summarizeFruitSales(sales.orders, sales.fruitProductIds);
  // Кг-ын нөөцүүдийн нийлбэр (0053) — савлагаа нь нөөцөөс тооцогддог тул давхар нэмэхгүй
  const stockKg = products
    .filter((p) => p.sku.startsWith("POOL-"))
    .reduce((s, p) => s + poolUnitsToKg(p.stock), 0);

  return (
    <>
      <FruitTopBar title="Хяналтын самбар" />
      <div className="flex-1 space-y-6 p-4 sm:p-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Энэ сарын жимсний борлуулалт" value={formatMnt(month.revenue)} icon="💰" tone="brand" />
          <KpiCard label="Захиалга (энэ сар)" value={String(month.orders)} icon="📦" tone="info" />
          <KpiCard label="Зарагдсан ширхэг" value={String(month.quantity)} icon="🍎" tone="lime" />
          <KpiCard label="Агуулахын үлдэгдэл" value={formatKg(stockKg)} icon="🏬" tone="warn" />
        </div>

        {products.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">
            Жимсний бараа хараахан нэмэгдээгүй байна.
          </div>
        )}

        <div className="rounded-2xl border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">Сүүлийн захиалгууд</h3>
            <Link href="/admin/fruit/orders" className="text-xs font-bold text-brand-700 hover:underline">
              Бүгд →
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-500">Жимсний захиалга алга</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recent.map((o) => (
                <OrderCard key={o.id} order={o} hrefBase="/admin/fruit/orders" enterAction={markFruitCourierEntered} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
