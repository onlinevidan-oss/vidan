import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { OrderCard } from "@/components/admin/OrderCard";
import { getAdminOrders, getOrderStatusCounts } from "@/lib/queries/orders";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export const metadata = { title: "Захиалга | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;

  const [{ counts, total }, orders] = await Promise.all([
    getOrderStatusCounts(),
    getAdminOrders({ status, limit: 50 }),
  ]);

  return (
    <>
      <TopBar title="Захиалга" crumb={status ? STATUS_LABEL[status as OrderStatus] : "Бүгд"} />
      <div className="flex-1 p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Захиалгын удирдлага
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Нийт <strong className="text-ink-900">{total}</strong> захиалга
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip href="/admin/orders" active={!status} label={`Бүгд (${total})`} />
          {(["new", "preparing", "shipping", "delivered", "cancelled"] as const).map((s) => (
            <Chip
              key={s}
              href={`/admin/orders?status=${s}`}
              active={status === s}
              label={`${STATUS_LABEL[s]} (${counts[s] ?? 0})`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white">
          {orders.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">📦</div>
              <div className="font-display text-base font-bold text-ink-700">
                Захиалга алга
              </div>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </div>

        {orders.length === 50 && (
          <div className="mt-3 text-center text-[11px] text-ink-500">
            Сүүлийн 50 захиалга харагдаж байна
          </div>
        )}
      </div>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white"
          : "rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
      }
    >
      {label}
    </Link>
  );
}
