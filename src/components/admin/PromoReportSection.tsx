import { formatUbDate } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";
import type { PromoEntry, PromoReport } from "@/lib/promo-report";

const TH =
  "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-3 py-2 text-[13px] text-ink-700";
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

const KIND_LABEL: Record<PromoEntry["kind"], string> = {
  campaign: "Хямдрал",
  promo: "Промо код",
  manual: "Үнийн хямдрал",
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

/** Зарлагдсан хугацаа, УБ өдрөөр. Төгсгөл нь оролцохгүй тул нэг мс хасна */
export function promoPeriodText(e: PromoEntry): string {
  if (e.kind === "manual") return "—";
  const from = e.startsAt ? formatUbDate(e.startsAt, DATE_OPTS) : "…";
  const to = e.endsAt
    ? formatUbDate(new Date(Date.parse(e.endsAt) - 1), DATE_OPTS)
    : "хугацаагүй";
  return `${from} – ${to}`;
}

const qty = (n: number) => n.toLocaleString("en-US");

export function PromoReportSection({ report }: { report: PromoReport }) {
  return (
    <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink-200 px-5 py-4">
        <h3 className="font-display text-[15px] font-extrabold">Урамшуулал</h3>
        <div className="text-right text-[12px] text-ink-500">
          Нийт хөнгөлөлт{" "}
          <b className="font-display text-brand-600">{formatMnt(report.totalDiscount)}</b>
        </div>
      </div>

      {report.entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-500">
          Энэ хугацаанд урамшуулал зарлагдаагүй
        </div>
      ) : (
        <div className="divide-y divide-ink-200">
          {report.entries.map((e) => (
            <PromoBlock key={e.key} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromoBlock({ e }: { e: PromoEntry }) {
  return (
    <div className="print-block">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[14px] font-extrabold text-ink-900">{e.name}</span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              {KIND_LABEL[e.kind]}
            </span>
            {e.detail && <span className="text-[12px] text-ink-500">{e.detail}</span>}
          </div>
          <div className="mt-1 text-[12px] text-ink-500">
            Хугацаа: <b className="text-ink-900">{promoPeriodText(e)}</b>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right text-[12px] text-ink-500">
          <div>
            <div>Захиалга</div>
            <div className="font-display text-[15px] font-extrabold text-ink-900">{e.orders}</div>
          </div>
          <div>
            <div>Ширхэг</div>
            <div className="font-display text-[15px] font-extrabold text-ink-900">{qty(e.quantity)}</div>
          </div>
          <div>
            <div>Хөнгөлөлт</div>
            <div className="font-display text-[15px] font-extrabold text-brand-600">
              {formatMnt(e.discount)}
            </div>
          </div>
        </div>
      </div>

      {e.products.length === 0 ? (
        <div className="px-5 py-4 text-[13px] text-ink-500">Энэ хугацаанд ашиглагдаагүй</div>
      ) : (
        <div className="overflow-x-auto px-2 pb-3 pt-2">
          <table className="w-full min-w-[620px]">
            <thead className="bg-ink-100/60">
              <tr>
                <th className={`${TH} w-10`}>№</th>
                <th className={TH}>Хөнгөлөлт эдэлсэн бараа</th>
                <th className={TH}>SKU</th>
                <th className={`${TH} text-right`}>Ширхэг</th>
                <th className={`${TH} text-right`}>Үндсэн дүн</th>
                <th className={`${TH} text-right`}>Хөнгөлөлт</th>
                <th className={`${TH} text-right`}>Борлуулсан дүн</th>
              </tr>
            </thead>
            <tbody>
              {e.products.map((p, i) => (
                <tr key={`${p.sku}-${i}`} className="border-t border-ink-100">
                  <td className={`${TD} tabular-nums text-ink-500`}>{i + 1}</td>
                  <td className={`${TD} font-semibold text-ink-900`}>{p.name}</td>
                  <td className={`${TD} whitespace-nowrap text-[12px] text-ink-500`}>{p.sku}</td>
                  <td className={TD_NUM}>{qty(p.quantity)}</td>
                  <td className={TD_NUM}>{formatMnt(p.listAmount)}</td>
                  <td className={`${TD_NUM} text-brand-600`}>− {formatMnt(p.discount)}</td>
                  <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                    {formatMnt(p.soldAmount)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink-200 bg-ink-100/50">
                <td className={TD} />
                <td className={`${TD} font-display font-extrabold text-ink-900`}>НИЙТ</td>
                <td className={TD} />
                <td className={`${TD_NUM} font-display font-black text-ink-900`}>{qty(e.quantity)}</td>
                <td className={`${TD_NUM} font-display font-black text-ink-900`}>
                  {formatMnt(e.listAmount)}
                </td>
                <td className={`${TD_NUM} font-display font-black text-brand-600`}>
                  − {formatMnt(e.discount)}
                </td>
                <td className={`${TD_NUM} font-display font-black text-ink-900`}>
                  {formatMnt(e.soldAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
