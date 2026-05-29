import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { getReports } from "@/lib/queries/reports";
import { formatMnt } from "@/lib/utils";

export const metadata = { title: "Тайлан | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const CAT_COLORS = ["#d72327", "#b5d33d", "#e89823", "#2e7eda", "#1a1410", "#7c3aed", "#2da764"];

export default async function AdminReports() {
  const data = await getReports(30);
  const maxRev = Math.max(1, ...data.byDay.map((d) => d.revenue));
  const maxProduct = Math.max(1, ...data.topProducts.map((p) => p.revenue));

  // Donut math
  let acc = 0;
  const donutSegs = data.byCategory.map((c, i) => {
    const start = acc;
    acc += c.share * 100;
    return {
      ...c,
      offsetStart: start,
      length: c.share * 100,
      color: CAT_COLORS[i % CAT_COLORS.length],
    };
  });

  return (
    <>
      <TopBar title="Тайлан" crumb="Сүүлийн 30 хоног" />
      <div className="flex-1 space-y-6 p-7">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Борлуулалтын тайлан
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">Сүүлийн 30 хоног</div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Нийт орлого" value={formatMnt(data.totals.revenue)} icon="💰" tone="brand" />
          <KpiCard label="Захиалга" value={data.totals.orders.toString()} icon="📦" tone="lime" />
          <KpiCard label="Дундаж захиалга" value={formatMnt(data.totals.avgOrder)} icon="🧾" tone="info" />
          <KpiCard label="Нийт хэрэглэгч" value={data.totals.customers.toString()} icon="👥" tone="warn" />
        </div>

        {/* Revenue + Category */}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          {/* Revenue chart */}
          <div className="rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">Орлогын динамик</h3>
            </div>
            <div className="p-5">
              {data.totals.orders === 0 ? (
                <div className="grid h-[260px] place-items-center text-sm text-ink-500">
                  📊 Сүүлийн 30 хоногт захиалга алга
                </div>
              ) : (
                <svg viewBox="0 0 600 260" className="w-full">
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d72327" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#d72327" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {[0, 1, 2, 3].map((i) => (
                    <line
                      key={i}
                      x1={40}
                      y1={40 + i * 50}
                      x2={580}
                      y2={40 + i * 50}
                      stroke="#e6e1d8"
                    />
                  ))}
                  {/* Path */}
                  {(() => {
                    const w = 540;
                    const h = 200;
                    const step = w / Math.max(1, data.byDay.length - 1);
                    const points = data.byDay.map((d, i) => {
                      const x = 40 + i * step;
                      const y = 40 + h - (d.revenue / maxRev) * h;
                      return { x, y };
                    });
                    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
                    const area = `${path} L${points[points.length - 1].x},${40 + h} L${points[0].x},${40 + h} Z`;
                    return (
                      <>
                        <path d={area} fill="url(#rev)" />
                        <path d={path} fill="none" stroke="#d72327" strokeWidth="2.5" strokeLinejoin="round" />
                        {points.length > 0 && (
                          <circle
                            cx={points[points.length - 1].x}
                            cy={points[points.length - 1].y}
                            r="5"
                            fill="#d72327"
                            stroke="white"
                            strokeWidth="2"
                          />
                        )}
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

          {/* Category donut */}
          <div className="rounded-2xl border border-ink-200 bg-white">
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
                      const len = (s.length / 100) * circ;
                      const offset = -(s.offsetStart / 100) * circ;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={s.color}
                          strokeWidth="14"
                          strokeDasharray={`${len} ${circ}`}
                          strokeDashoffset={offset}
                          transform="rotate(-90 50 50)"
                        />
                      );
                    })}
                    <text x="50" y="48" textAnchor="middle" fill="#1a1410" fontSize="11" fontWeight="900">
                      {data.totals.orders}
                    </text>
                    <text x="50" y="60" textAnchor="middle" fill="#7a7166" fontSize="6">
                      захиалга
                    </text>
                  </svg>
                  <div className="flex-1 space-y-1.5">
                    {donutSegs.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: s.color }}
                        />
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

        {/* Top products + payment */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">🔥 Топ 7 бүтээгдэхүүн</h3>
            </div>
            <div className="space-y-3 p-5">
              {data.topProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-500">
                  Өгөгдөл алга
                </div>
              ) : (
                data.topProducts.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-[140px] truncate text-xs font-semibold text-ink-700">
                      {p.name}
                    </div>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-ink-100">
                      <div
                        className="flex h-full items-center bg-gradient-to-r from-brand-500 to-brand-700 px-2 text-[10px] font-bold text-white"
                        style={{ width: `${Math.max(8, (p.revenue / maxProduct) * 100)}%` }}
                      >
                        {p.sold} ш
                      </div>
                    </div>
                    <div className="font-display w-[80px] text-right text-xs font-extrabold text-ink-900">
                      {formatMnt(p.revenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold">Төлбөрийн арга</h3>
            </div>
            <div className="space-y-3 p-5">
              {data.byPayment.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-500">
                  Өгөгдөл алга
                </div>
              ) : (
                data.byPayment.map((p) => (
                  <div key={p.method} className="flex items-center gap-3">
                    <div className="w-[100px] text-xs font-bold uppercase text-ink-700">
                      {p.method}
                    </div>
                    <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-ink-100">
                      <div
                        className="flex h-full items-center bg-gradient-to-r from-lime-500 to-lime-700 px-2 text-[10px] font-bold text-ink-900"
                        style={{ width: `${Math.max(8, p.share * 100)}%` }}
                      >
                        {Math.round(p.share * 100)}%
                      </div>
                    </div>
                    <div className="font-display w-[40px] text-right text-xs font-extrabold text-ink-900">
                      {p.count}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
