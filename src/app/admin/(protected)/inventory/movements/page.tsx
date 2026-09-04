import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { getStockMovements } from "@/lib/queries/inventory";
import { ubDateKey } from "@/lib/datetime";

export const metadata = { title: "Орлого, зарлага | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const qty = (n: number) => n.toLocaleString("mn-MN");

const TH = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-3 py-2.5 text-[13px] text-ink-700";

const KIND_LABEL: Record<string, { label: string; cls: string }> = {
  in: { label: "Орлого", cls: "bg-lime-100 text-lime-700" },
  out: { label: "Зарлага", cls: "bg-brand-100 text-brand-700" },
  adjust: { label: "Тохируулга", cls: "bg-[#fdf2dc] text-[#a3660d]" },
};

export default async function StockMovementsPage() {
  const result = await getStockMovements();

  return (
    <>
      <TopBar title="Агуулах" crumb="Орлого, зарлага" />
      <div className="flex-1 space-y-5 p-7 print:space-y-4 print:p-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Орлого, зарлагын түүх
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Үлдэгдэл өөрчлөгдсөн бүх хөдөлгөөн
            </div>
          </div>
          <Link
            href="/admin/inventory"
            className="print-hide rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            ← Агуулахын үлдэгдэл
          </Link>
        </div>

        {!result.ready ? (
          <div className="rounded-2xl border-[1.5px] border-[#e89823] bg-[#fdf2dc] p-5">
            <div className="font-display text-[15px] font-extrabold text-[#a3660d]">
              Бүртгэл хараахан идэвхжээгүй
            </div>
            <p className="mt-1.5 text-[13px] text-ink-700">
              <code className="rounded bg-white/70 px-1.5 py-0.5 text-[12px]">
                supabase/migrations/0028_stock_movements.sql
              </code>{" "}
              -г Supabase дээр ажиллуулсны дараа орлого, зарлагын түүх энд
              харагдана.
            </p>
            <p className="mt-2 text-[12px] text-ink-500">
              Дэлгэрэнгүй: {result.error}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 sm:grid-cols-3">
              {[
                { label: "Нийт орлого", value: `+${qty(result.totalIn)} ш` },
                { label: "Нийт зарлага", value: `${qty(result.totalOut)} ш` },
                {
                  label: "Зөрүү",
                  value: `${qty(result.totalIn + result.totalOut)} ш`,
                },
              ].map((s) => (
                <div key={s.label} className="bg-white px-5 py-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    {s.label}
                  </div>
                  <div className="font-display mt-0.5 text-[18px] font-extrabold text-ink-900">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {result.rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-ink-500">
                  Хөдөлгөөн бүртгэгдээгүй байна
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className="bg-ink-100/60">
                      <tr>
                        <th className={TH}>Огноо</th>
                        <th className={TH}>Төрөл</th>
                        <th className={TH}>Бүтээгдэхүүн</th>
                        <th className={`${TH} text-right`}>Тоо</th>
                        <th className={TH}>Тайлбар</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((m) => {
                        const k = KIND_LABEL[m.kind] ?? KIND_LABEL.adjust;
                        return (
                          <tr key={m.id} className="border-t border-ink-100">
                            <td className={`${TD} whitespace-nowrap tabular-nums text-ink-500`}>
                              {ubDateKey(new Date(m.occurredAt))}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold ${k.cls}`}
                              >
                                {k.label}
                              </span>
                            </td>
                            <td className={`${TD} font-semibold text-ink-900`}>
                              {m.productName}
                              <span className="ml-1.5 text-[11px] font-normal text-ink-500">
                                {m.sku}
                              </span>
                            </td>
                            <td
                              className={`${TD} text-right font-display font-extrabold tabular-nums ${
                                m.quantity > 0 ? "text-lime-700" : "text-brand-600"
                              }`}
                            >
                              {m.quantity > 0 ? `+${qty(m.quantity)}` : qty(m.quantity)}
                            </td>
                            <td className={`${TD} text-[12px] text-ink-500`}>
                              {m.note ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
