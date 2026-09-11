import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { getDashboardStats } from "@/lib/queries/dashboard";
import { OrderCard } from "@/components/admin/OrderCard";
import { getCurrentStaff } from "@/lib/queries/staff";
import { formatMnt } from "@/lib/utils";

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
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-brand-700 hover:text-brand-900"
            >
              Бүгд →
            </Link>
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
            <div className="divide-y divide-ink-100">
              {stats.recentOrders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
