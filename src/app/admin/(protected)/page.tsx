import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { getCurrentStaff } from "@/lib/queries/staff";
import { formatMnt, formatPhone } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  new:       "bg-[#e8f1fc] text-[#2e7eda]",
  preparing: "bg-lime-100   text-lime-700",
  shipping:  "bg-[#ede1f5]  text-[#7c3aed]",
  delivered: "bg-[#e3f5ea]  text-[#2da764]",
  cancelled: "bg-brand-100  text-brand-700",
};

const STATUS_LABEL: Record<string, string> = {
  new:       "Шинэ",
  preparing: "Бэлтгэж байна",
  shipping:  "Жолоочид",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [staff, stats] = await Promise.all([
    getCurrentStaff(),
    getDashboardStats(),
  ]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <>
      <TopBar title="Хяналтын самбар" crumb="Өнөөдөр" />

      <div className="flex-1 p-7">
        {/* Welcome */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Тавтай морил, {staff?.full_name ?? "Админ"} 👋
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">{dateStr}</div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-[13px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700">
              📅 Өнөөдөр
            </button>
            <button className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-700">
              ＋ Шинэ захиалга
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Өнөөдрийн орлого"
            value={formatMnt(stats.todayRevenue)}
            delta={stats.todayRevenue > 0 ? "өнөөдөр" : "захиалга алга"}
            trend={stats.todayRevenue > 0 ? "up" : "flat"}
            icon="💰"
            tone="brand"
          />
          <KpiCard
            label="Захиалга"
            value={stats.todayOrders.toString()}
            delta="өнөөдөр"
            trend={stats.todayOrders > 0 ? "up" : "flat"}
            icon="📦"
            tone="lime"
          />
          <KpiCard
            label="Шинэ хэрэглэгч"
            value={stats.newCustomersThisMonth.toString()}
            delta="энэ сар"
            trend={stats.newCustomersThisMonth > 0 ? "up" : "flat"}
            icon="👥"
            tone="info"
          />
          <KpiCard
            label="Дуусч буй нөөц"
            value={stats.lowStockCount.toString()}
            delta={stats.lowStockCount > 0 ? "анхаар" : "бүгд бэлэн"}
            trend={stats.lowStockCount > 0 ? "down" : "flat"}
            icon="⚠️"
            tone="warn"
          />
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-ink-200 bg-white">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4">
            <h3 className="font-display text-[15px] font-extrabold text-ink-900">
              Сүүлийн захиалгууд
            </h3>
            <a
              href="/admin/orders"
              className="text-xs font-bold text-brand-700 hover:text-brand-900"
            >
              Бүгд →
            </a>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="grid place-items-center px-5 py-14 text-center">
              <div className="mb-3 text-4xl opacity-40">📦</div>
              <div className="font-display text-base font-bold text-ink-700">
                Захиалга хараахан байхгүй
              </div>
              <div className="mt-1 text-xs text-ink-500">
                Эхний захиалга орж ирмэгц энд харагдана
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    <Th>№</Th>
                    <Th>Хэрэглэгч</Th>
                    <Th>Дүн</Th>
                    <Th>Төлөв</Th>
                    <Th>Цаг</Th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-ink-100 hover:bg-cream">
                      <td className="px-4 py-3.5 font-display font-bold">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold">
                          {o.customer_name || "—"}
                        </div>
                        <div className="text-xs text-ink-500">
                          {o.customer_phone
                            ? formatPhone(o.customer_phone)
                            : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-display font-bold">
                        {formatMnt(o.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[o.status] ?? "bg-ink-100 text-ink-500"}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-ink-500">
                        {new Date(o.created_at).toLocaleString("mn-MN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
      {children}
    </th>
  );
}
