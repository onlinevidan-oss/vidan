import Link from "next/link";
import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { OrderCard } from "@/components/admin/OrderCard";
import { getFruitOrders } from "@/lib/queries/fruit";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { markFruitCourierEntered } from "../actions";

export const dynamic = "force-dynamic";

const FILTERS: (OrderStatus | "all")[] = ["all", "new", "preparing", "shipping", "delivered", "cancelled"];

export default async function FruitOrders({ searchParams }: PageProps<"/admin/fruit/orders">) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = raw && (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : null;
  const orders = await getFruitOrders({ status: status ?? undefined });

  return (
    <>
      <FruitTopBar title="Захиалга" crumb={status ? STATUS_LABEL[status] : "Бүгд"} />
      <div className="flex-1 space-y-4 p-4 sm:p-7">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = (f === "all" && !status) || f === status;
            return (
              <Link
                key={f}
                href={f === "all" ? "/admin/fruit/orders" : `/admin/fruit/orders?status=${f}`}
                className={
                  active
                    ? "rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white"
                    : "rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 hover:border-brand-300"
                }
              >
                {f === "all" ? "Бүгд" : STATUS_LABEL[f]}
              </Link>
            );
          })}
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink-500">Жимсний захиалга алга</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} hrefBase="/admin/fruit/orders" enterAction={markFruitCourierEntered} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
