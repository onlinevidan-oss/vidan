import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { ReportToolbar } from "@/components/admin/ReportToolbar";
import { getReports } from "@/lib/queries/reports";
import { resolvePeriod } from "@/lib/report-period";
import { ubDateKey } from "@/lib/datetime";
import { formatMnt } from "@/lib/utils";

export const metadata = { title: "Тайлан | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const CAT_COLORS = ["#d72327", "#b5d33d", "#e89823", "#2e7eda", "#1a1410", "#7c3aed", "#2da764"];

/** Тоо ширхэгийг мянгатын таслалтай */
const qty = (n: number) => n.toLocaleString("mn-MN");

const PAYMENT_LABEL: Record<string, string> = {
  qpay: "QPay",
  card: "Карт",
  cash: "Бэлэн",
  toki: "Toki",
  socialpay: "SocialPay",
};

/** Хүснэгтийн нүдний нийтлэг класс */
const TH =
  "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500 whitespace-nowrap";
const TD = "px-3 py-2 text-[13px] text-ink-700";
const TD_NUM = `${TD} text-right tabular-nums whitespace-nowrap`;

export default async function AdminReports({
  searchParams,
}: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const period = resolvePeriod({
    preset: one(sp.preset),
    from: one(sp.from),
    to: one(sp.to),
  });

  const data = await getReports(period);
  const { finance, inventory } = data;
  const maxRev = Math.max(1, ...data.byDay.map((d) => d.revenue));
  const maxProduct = Math.max(1, ...data.soldProducts.map((p) => p.revenue));
  const totalSoldUnits = data.soldProducts.reduce((s, p) => s + p.sold, 0);

  // Donut math — өмнөх сегментүүдийн нийлбэр нь эхлэх байрлал
  const donutSegs = data.byCategory.map((c, i) => ({
    ...c,
    offsetStart: data.byCategory
      .slice(0, i)
      .reduce((sum, prev) => sum + prev.share * 100, 0),
    length: c.share * 100,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));

  return (
    <>
      <TopBar title="Тайлан" crumb={period.label} />
      <div className="flex-1 space-y-6 p-7 print:space-y-4 print:p-0">
        {/* ---------- Дэлгэцийн толгой ---------- */}
        <div className="print-hide">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Борлуулалтын тайлан
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">{period.label}</div>
        </div>

        <ReportToolbar period={period} />

        {/* ---------- Цаасан дээрх толгой ---------- */}
        <div className="print-only mb-4 border-b-2 border-ink-900 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
                Дөрвөн Өлзий ХХК · VIDAN
              </div>
              <h1 className="font-display mt-1 text-xl font-extrabold text-ink-900">
                Борлуулалтын тайлан
              </h1>
              <div className="mt-0.5 text-[13px] text-ink-700">
                Хугацаа: <b>{period.label}</b>
              </div>
            </div>
            <div className="text-right text-[11px] text-ink-500">
              <div>Тайлан гаргасан</div>
              <div className="font-bold text-ink-900">{ubDateKey()}</div>
            </div>
          </div>
        </div>

        {/* ---------- 1. Санхүүгийн задаргаа ---------- */}
        <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">
              Санхүүгийн задаргаа
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-500">
              Барааны орлого ба хүргэлтийн төлбөр тусад нь
            </p>
          </div>
          <div className="p-5">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-ink-100">
                  <td className={TD}>Барааны борлуулалт</td>
                  <td className={`${TD} text-right text-[12px] text-ink-500`}>
                    {qty(totalSoldUnits)} ширхэг
                  </td>
                  <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                    {formatMnt(finance.goods)}
                  </td>
                </tr>
                <tr className="border-b border-ink-100">
                  <td className={TD}>Промо хөнгөлөлт</td>
                  <td className={`${TD} text-right text-[12px] text-ink-500`} />
                  <td className={`${TD_NUM} font-display font-extrabold text-brand-600`}>
                    {finance.discount > 0 ? `− ${formatMnt(finance.discount)}` : formatMnt(0)}
                  </td>
                </tr>
                <tr className="border-b-2 border-ink-200 bg-ink-100/50">
                  <td className={`${TD} font-bold text-ink-900`}>
                    Барааны цэвэр орлого
                  </td>
                  <td className={TD} />
                  <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                    {formatMnt(finance.netGoods)}
                  </td>
                </tr>
                <tr className="border-b border-ink-100">
                  <td className={TD}>Хүргэлтийн орлого</td>
                  <td className={`${TD} text-right text-[12px] text-ink-500`}>
                    {finance.deliveries} удаа хүргэлт
                  </td>
                  <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                    {formatMnt(finance.shipping)}
                  </td>
                </tr>
                <tr className="border-b border-ink-100">
                  <td className={TD}>НӨАТ (10%)</td>
                  <td className={TD} />
                  <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                    {formatMnt(finance.tax)}
                  </td>
                </tr>
                <tr className="bg-brand-50">
                  <td className={`${TD} font-display text-[15px] font-extrabold text-ink-900`}>
                    НИЙТ ОРЛОГО
                  </td>
                  <td className={`${TD} text-right text-[12px] text-ink-500`}>
                    {finance.orders} захиалга
                  </td>
                  <td className={`${TD_NUM} font-display text-[17px] font-black text-brand-700`}>
                    {formatMnt(finance.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------- KPI ---------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          <KpiCard label="Барааны орлого" value={formatMnt(finance.netGoods)} icon="💰" tone="brand" />
          <KpiCard label="Хүргэлтийн орлого" value={formatMnt(finance.shipping)} icon="🚚" tone="lime" />
          <KpiCard label="Захиалга" value={finance.orders.toString()} icon="📦" tone="info" />
          <KpiCard label="Дундаж захиалга" value={formatMnt(finance.avgOrder)} icon="🧾" tone="warn" />
        </div>

        {/* ---------- Динамик + ангилал ---------- */}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">Орлогын динамик</h3>
            </div>
            <div className="p-5">
              {finance.orders === 0 ? (
                <div className="grid h-[260px] place-items-center text-sm text-ink-500">
                  📊 Энэ хугацаанд захиалга алга
                </div>
              ) : (
                <svg viewBox="0 0 600 260" className="w-full">
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d72327" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#d72327" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1={40} y1={40 + i * 50} x2={580} y2={40 + i * 50} stroke="#e6e1d8" />
                  ))}
                  {(() => {
                    const w = 540;
                    const h = 200;
                    const step = w / Math.max(1, data.byDay.length - 1);
                    const points = data.byDay.map((d, i) => ({
                      x: 40 + i * step,
                      y: 40 + h - (d.revenue / maxRev) * h,
                    }));
                    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                    const area = `${path} L${points[points.length - 1].x},${40 + h} L${points[0].x},${40 + h} Z`;
                    return (
                      <>
                        <path d={area} fill="url(#rev)" />
                        <path d={path} fill="none" stroke="#d72327" strokeWidth="2.5" strokeLinejoin="round" />
                        <circle
                          cx={points[points.length - 1].x}
                          cy={points[points.length - 1].y}
                          r="5"
                          fill="#d72327"
                          stroke="white"
                          strokeWidth="2"
                        />
                      </>
                    );
                  })()}
                  <g fill="#7a7166" fontSize="10">
                    <text x="0" y="44">{formatMnt(maxRev)}</text>
                    <text x="0" y="244">₮0</text>
                  </g>
                </svg>
              )}
            </div>
          </div>

          <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">Ангиллын хувь</h3>
            </div>
            <div className="p-5">
              {donutSegs.length === 0 ? (
                <div className="grid h-[180px] place-items-center text-sm text-ink-500">
                  Өгөгдөл алга
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <svg viewBox="0 0 100 100" width="140" height="140">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f3efe7" strokeWidth="14" />
                    {donutSegs.map((s, i) => {
                      const circ = 2 * Math.PI * 40;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={s.color}
                          strokeWidth="14"
                          strokeDasharray={`${(s.length / 100) * circ} ${circ}`}
                          strokeDashoffset={-(s.offsetStart / 100) * circ}
                          transform="rotate(-90 50 50)"
                        />
                      );
                    })}
                    <text x="50" y="48" textAnchor="middle" fill="#1a1410" fontSize="11" fontWeight="900">
                      {finance.orders}
                    </text>
                    <text x="50" y="60" textAnchor="middle" fill="#7a7166" fontSize="6">
                      захиалга
                    </text>
                  </svg>
                  <div className="flex-1 space-y-1.5">
                    {donutSegs.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                        <span className="flex-1 text-ink-700">{s.name}</span>
                        <span className="font-display font-extrabold text-ink-900">
                          {Math.round(s.share * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------- 2. Зарагдсан бүтээгдэхүүн ---------- */}
        <div className="print-card print-break rounded-2xl border border-ink-200 bg-white">
          <div className="flex items-baseline justify-between gap-4 border-b border-ink-200 px-5 py-4">
            <div>
              <h3 className="font-display text-[15px] font-extrabold">
                Зарагдсан бүтээгдэхүүн
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-500">
                Нэр төрөл бүрээр — тоо ширхэг ба дүн
              </p>
            </div>
            <div className="text-right text-[12px] text-ink-500">
              <b className="font-display text-ink-900">{data.soldProducts.length}</b> нэр төрөл ·{" "}
              <b className="font-display text-ink-900">{qty(totalSoldUnits)}</b> ширхэг
            </div>
          </div>

          {data.soldProducts.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-500">
              Энэ хугацаанд борлуулалт алга
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-ink-100/60">
                  <tr>
                    <th className={`${TH} w-10`}>№</th>
                    <th className={TH}>Бүтээгдэхүүн</th>
                    <th className={TH}>SKU</th>
                    <th className={`${TH} text-right`}>Тоо ширхэг</th>
                    <th className={`${TH} text-right`}>Дүн</th>
                    <th className={`${TH} w-[110px] print:hidden`}>Эзлэх хувь</th>
                  </tr>
                </thead>
                <tbody>
                  {data.soldProducts.map((p, i) => (
                    <tr key={`${p.sku}-${i}`} className="border-t border-ink-100">
                      <td className={`${TD} text-ink-500 tabular-nums`}>{i + 1}</td>
                      <td className={`${TD} font-semibold text-ink-900`}>{p.name}</td>
                      <td className={`${TD} whitespace-nowrap text-[12px] text-ink-500`}>{p.sku}</td>
                      <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                        {qty(p.sold)}
                      </td>
                      <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                        {formatMnt(p.revenue)}
                      </td>
                      <td className="px-3 py-2 print:hidden">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                            style={{ width: `${Math.max(4, (p.revenue / maxProduct) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-ink-200 bg-ink-100/50">
                    <td className={TD} />
                    <td className={`${TD} font-display font-extrabold text-ink-900`}>
                      НИЙТ
                    </td>
                    <td className={TD} />
                    <td className={`${TD_NUM} font-display font-black text-ink-900`}>
                      {qty(totalSoldUnits)}
                    </td>
                    <td className={`${TD_NUM} font-display font-black text-ink-900`}>
                      {formatMnt(finance.goods)}
                    </td>
                    <td className="print:hidden" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-500">
            Дүн нь промо хөнгөлөлтийн өмнөх барааны үнэ. Хөнгөлөлт нь захиалгын
            түвшинд бодогддог тул санхүүгийн задаргаанд тусад нь харагдана.
          </p>
        </div>

        {/* ---------- 3. Агуулахын үлдэгдэл (хураангуй) ---------- */}
        <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-ink-200 px-5 py-4">
            <div>
              <h3 className="font-display text-[15px] font-extrabold">
                Агуулахын үлдэгдэл
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-500">
                Тайлан хэвлэсэн мөчийн байдлаар
              </p>
            </div>
            <Link
              href="/admin/inventory"
              className="print-hide rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              🏬 Дэлгэрэнгүй харах →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-px bg-ink-200 sm:grid-cols-4 print:grid-cols-4">
            {[
              { label: "Нэр төрөл", value: `${inventory.skuCount}` },
              { label: "Нийт ширхэг", value: qty(inventory.totalUnits) },
              { label: "Үлдэгдлийн дүн", value: formatMnt(inventory.totalValue) },
              {
                label: "Анхаарах",
                value: `${inventory.lowCount + inventory.outCount} нэр`,
              },
            ].map((s) => (
              <div key={s.label} className="bg-white px-5 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  {s.label}
                </div>
                <div className="font-display mt-0.5 text-[17px] font-extrabold text-ink-900">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <p className="px-5 py-3 text-[11px] text-ink-500">
            Бүтээгдэхүүн бүрийн үлдэгдэл, зарлагыг зурагтай нь{" "}
            <span className="font-semibold text-ink-700">Агуулах</span> хуудсанд
            тусад нь хэвлэнэ.
          </p>
        </div>

        {/* ---------- Төлбөрийн арга ---------- */}
        <div className="print-card print-block rounded-2xl border border-ink-200 bg-white">
          <div className="border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold">Төлбөрийн арга</h3>
          </div>
          {data.byPayment.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-500">Өгөгдөл алга</div>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-100/60">
                <tr>
                  <th className={TH}>Арга</th>
                  <th className={`${TH} text-right`}>Захиалга</th>
                  <th className={`${TH} text-right`}>Эзлэх хувь</th>
                  <th className={`${TH} text-right`}>Дүн</th>
                </tr>
              </thead>
              <tbody>
                {data.byPayment.map((p) => (
                  <tr key={p.method} className="border-t border-ink-100">
                    <td className={`${TD} font-semibold text-ink-900`}>
                      {PAYMENT_LABEL[p.method] ?? p.method}
                    </td>
                    <td className={`${TD_NUM} font-display font-extrabold`}>{p.count}</td>
                    <td className={TD_NUM}>{Math.round(p.share * 100)}%</td>
                    <td className={`${TD_NUM} font-display font-extrabold text-ink-900`}>
                      {formatMnt(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------- Гарын үсэг (зөвхөн цаасан дээр) ---------- */}
        <div className="print-only pt-8">
          <div className="flex justify-between gap-12 text-[12px] text-ink-700">
            <div className="flex-1">
              <div className="mb-8">Тайлан гаргасан:</div>
              <div className="border-t border-ink-900 pt-1 text-ink-500">
                нэр, гарын үсэг
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-8">Хүлээн авсан (санхүү):</div>
              <div className="border-t border-ink-900 pt-1 text-ink-500">
                нэр, гарын үсэг
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
