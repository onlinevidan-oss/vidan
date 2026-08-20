import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { getDashboardStats, type RecentOrder } from "@/lib/queries/dashboard";
import { getCurrentStaff } from "@/lib/queries/staff";
import { formatMnt, formatPhone } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";

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

/**
 * Захиалгын бүтэн карт — дарж орохгүйгээр хэрэглэгч, утас, хаяг болон
 * захиалсан бараа нь зурагтайгаа шууд харагдана.
 */
function OrderCard({ order: o }: { order: RecentOrder }) {
  return (
    <Link
      href={`/admin/orders/${o.id}`}
      className="block px-5 py-4 transition hover:bg-cream"
    >
      {/* Мөр 1 — дугаар, төлөв, дүн, цаг */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-display text-[15px] font-extrabold text-ink-900">
          {o.order_number}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status as OrderStatus] ?? "bg-ink-100 text-ink-500"}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
        </span>
        <span className="ml-auto font-display text-[15px] font-extrabold text-ink-900">
          {formatMnt(o.total)}
        </span>
        <span className="w-full text-[11px] text-ink-500 sm:w-auto">
          {new Date(o.created_at).toLocaleString("mn-MN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Мөр 2 — хэрэглэгч, утас, хаяг */}
      <div className="mt-2 space-y-0.5 text-[13px]">
        <div className="font-semibold text-ink-900">
          {o.customer_name || "Нэргүй хэрэглэгч"}
          {o.customer_phone ? (
            <span className="ml-2 font-bold text-brand-700">
              📞 {formatPhone(o.customer_phone)}
            </span>
          ) : (
            <span className="ml-2 text-[11px] font-bold text-brand-700">
              ⚠️ утасгүй
            </span>
          )}
          {o.customer_phone2 && (
            <span className="ml-1.5 text-xs text-ink-500">
              / {formatPhone(o.customer_phone2)}
            </span>
          )}
        </div>
        <div className="text-ink-500">📍 {o.address || "Хаяг байхгүй"}</div>
      </div>

      {/* Мөр 3 — захиалсан бараа зурагтайгаа */}
      {o.items.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {o.items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white py-1 pl-1 pr-2.5"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-cream-100">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs opacity-40">📦</span>
                )}
              </div>
              <span className="text-[12px] text-ink-700">
                {it.name}
                <strong className="ml-1 text-ink-900">×{it.quantity}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
