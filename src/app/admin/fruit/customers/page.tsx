import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { getFruitCustomers } from "@/lib/queries/fruit";
import { formatMnt, formatPhone } from "@/lib/utils";
import { formatUbDate } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const TH = "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-4 py-2.5 text-[13px] text-ink-700";

/** Жимс худалдан авсан хэрэглэгчид — дүн нь зөвхөн жимсний */
export default async function FruitCustomers() {
  const customers = await getFruitCustomers();
  return (
    <>
      <FruitTopBar title="Хэрэглэгч" crumb={`${customers.length}`} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          {customers.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">Жимс худалдан авсан хэрэглэгч алга</div>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={TH}>Хэрэглэгч</th>
                  <th className={TH}>Утас</th>
                  <th className={`${TH} text-right`}>Захиалга</th>
                  <th className={`${TH} text-right`}>Жимс (ш)</th>
                  <th className={`${TH} text-right`}>Жимсний дүн</th>
                  <th className={TH}>Сүүлд</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.user_id} className="border-t border-ink-100">
                    <td className={`${TD} font-semibold text-ink-900`}>{c.name || "Нэргүй хэрэглэгч"}</td>
                    <td className={TD}>{c.phone ? formatPhone(c.phone) : "—"}</td>
                    <td className={`${TD} text-right tabular-nums`}>{c.orders}</td>
                    <td className={`${TD} text-right tabular-nums`}>{c.quantity}</td>
                    <td className={`${TD} text-right font-bold tabular-nums text-ink-900`}>{formatMnt(c.revenue)}</td>
                    <td className={TD}>{formatUbDate(c.last_order_at, { year: "numeric", month: "2-digit", day: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
