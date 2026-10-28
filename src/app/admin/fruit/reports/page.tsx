import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { ReportToolbar } from "@/components/admin/ReportToolbar";
import { getFruitSales } from "@/lib/queries/fruit";
import { summarizeFruitSales } from "@/lib/fruit-report";
import { periodToUtcRange, resolvePeriod } from "@/lib/report-period";
import { formatMnt } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TH = "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500";
const TD = "px-4 py-2.5 text-[13px] text-ink-700";

/**
 * Жимсний тайлан — холимог захиалгад ч ЗӨВХӨН жимсний мөр. Хоёр компани
 * "хэдэн ширхэг, хэдэн төгрөгийн жимс" гэдгээр тооцоогоо тулна.
 */
export default async function FruitReports({ searchParams }: PageProps<"/admin/fruit/reports">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const period = resolvePeriod({ preset: one(sp.preset), from: one(sp.from), to: one(sp.to) });
  const sales = await getFruitSales(periodToUtcRange(period));
  const s = summarizeFruitSales(sales.orders, sales.fruitProductIds);

  return (
    <>
      <FruitTopBar title="Тайлан" crumb={period.label} />
      <div className="flex-1 space-y-6 p-4 sm:p-7">
        <ReportToolbar period={period} basePath="/admin/fruit/reports" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Жимсний борлуулалт" value={formatMnt(s.revenue)} icon="💰" tone="brand" />
          <KpiCard label="Ширхэг" value={String(s.quantity)} icon="🍎" tone="lime" />
          <KpiCard label="Захиалга" value={String(s.orders)} icon="📦" tone="info" />
          <KpiCard label="Хэрэглэгч" value={String(s.customers)} icon="👥" tone="warn" />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">Бараа тус бүрээр</h3>
          </div>
          {s.byProduct.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-500">Энэ хугацаанд жимсний борлуулалт алга</div>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={TH}>Бараа</th>
                  <th className={TH}>SKU</th>
                  <th className={`${TH} text-right`}>Ширхэг</th>
                  <th className={`${TH} text-right`}>Дүн</th>
                </tr>
              </thead>
              <tbody>
                {s.byProduct.map((p, i) => (
                  <tr key={`${p.sku}-${i}`} className="border-t border-ink-100">
                    <td className={`${TD} font-semibold text-ink-900`}>{p.name}</td>
                    <td className={`${TD} text-[12px] text-ink-500`}>{p.sku}</td>
                    <td className={`${TD} text-right tabular-nums`}>{p.quantity}</td>
                    <td className={`${TD} text-right font-bold tabular-nums text-ink-900`}>{formatMnt(p.revenue)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-ink-200 bg-ink-100/50">
                  <td className={`${TD} font-extrabold text-ink-900`}>НИЙТ</td>
                  <td className={TD} />
                  <td className={`${TD} text-right font-black tabular-nums`}>{s.quantity}</td>
                  <td className={`${TD} text-right font-black tabular-nums text-ink-900`}>{formatMnt(s.revenue)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
