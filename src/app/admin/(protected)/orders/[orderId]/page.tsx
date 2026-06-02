import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { createClient } from "@/lib/supabase/server";
import { formatMnt, formatPhone } from "@/lib/utils";
import { OrderActions } from "@/components/admin/OrderActions";
import {
  STATUS_FLOW,
  NEXT_STATUS_LABEL as NEXT_LABEL,
  type OrderStatus,
} from "@/lib/order-status";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: PageProps<"/admin/orders/[orderId]">) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      *,
      items:order_items(*),
      address:addresses(*),
      user:profiles(full_name, phone, email, segment, total_orders, total_spent),
      events:order_events(*)
    `,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) notFound();

  const userObj = order.user as {
    full_name: string | null;
    phone: string | null;
    email: string | null;
    segment: string | null;
    total_orders: number | null;
    total_spent: number | null;
  } | null;

  const events = (order.events as { id: string; event_type: string; description: string | null; created_at: string }[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const currentIdx = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <>
      <TopBar title="Захиалга" crumb={order.order_number} />
      <div className="flex-1 p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Захиалга <span className="text-brand-700">{order.order_number}</span>
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              {new Date(order.created_at).toLocaleString("mn-MN")} ·{" "}
              {(order.payment_method ?? "—").toUpperCase()} ·{" "}
              <span className="font-bold">
                {order.payment_status === "paid" ? "✓ Төлөгдсөн" : "⏳ Төлөгдөөгүй"}
              </span>
            </div>
          </div>
          <Link
            href="/admin/orders"
            className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            ← Буцах
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          {/* Left */}
          <div className="space-y-5">
            {/* Items */}
            <div className="rounded-2xl border border-ink-200 bg-white">
              <div className="border-b border-ink-200 px-5 py-4">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
                  Бараа ({order.items.length})
                </h3>
              </div>
              <div className="divide-y divide-ink-100">
                {order.items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <div className="font-semibold text-ink-900">{i.product_name}</div>
                      <div className="text-xs text-ink-500">
                        SKU: {i.product_sku} · {formatMnt(Number(i.unit_price))} × {i.quantity}
                      </div>
                    </div>
                    <div className="font-display font-extrabold text-ink-900">
                      {formatMnt(Number(i.subtotal))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink-200 px-5 py-4 text-sm">
                <Row label="Дэд дүн" value={formatMnt(Number(order.subtotal))} />
                {Number(order.discount) > 0 && (
                  <Row label="Хямдрал" value={`−${formatMnt(Number(order.discount))}`} />
                )}
                <Row
                  label="Хүргэлт"
                  value={Number(order.shipping) === 0 ? "Үнэгүй" : formatMnt(Number(order.shipping))}
                />
                <Row label="НӨАТ" value={formatMnt(Number(order.tax))} />
                <div className="my-2 h-px bg-ink-100" />
                <div className="flex justify-between">
                  <span className="font-bold">Нийт</span>
                  <span className="font-display text-lg font-black text-brand-700">
                    {formatMnt(Number(order.total))}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-ink-200 bg-white">
              <div className="border-b border-ink-200 px-5 py-4">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
                  Үйл явдлын түүх
                </h3>
              </div>
              <div className="divide-y divide-ink-100">
                {events.map((e) => (
                  <div key={e.id} className="flex gap-3 px-5 py-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime-100 text-xs text-lime-700">
                      ●
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink-900">
                        {e.description ?? e.event_type}
                      </div>
                      <div className="text-xs text-ink-500">
                        {new Date(e.created_at).toLocaleString("mn-MN")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <aside className="space-y-5">
            <OrderActions
              orderId={order.id}
              currentStatus={order.status}
              paymentStatus={order.payment_status}
              nextLabel={nextStatus ? NEXT_LABEL[order.status as OrderStatus] ?? null : null}
              nextStatus={nextStatus ?? null}
            />

            {userObj && (
              <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                  Хэрэглэгч
                </h3>
                <div className="font-bold text-ink-900">{userObj.full_name || "—"}</div>
                {userObj.phone && (
                  <div className="mt-0.5 text-xs text-ink-500">
                    📞 {formatPhone(userObj.phone)}
                  </div>
                )}
                {userObj.email && (
                  <div className="text-xs text-ink-500">✉ {userObj.email}</div>
                )}
                <div className="mt-3 space-y-1 text-xs text-ink-500">
                  <div>
                    {userObj.total_orders ?? 0} захиалга ·{" "}
                    {formatMnt(Number(userObj.total_spent ?? 0))}
                  </div>
                  <div>
                    Segment:{" "}
                    <span className="font-bold uppercase text-ink-900">
                      {userObj.segment ?? "new"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {order.address && (
              <div className="rounded-2xl border border-ink-200 bg-white p-5">
                <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                  Хүргэх хаяг
                </h3>
                <div className="text-sm text-ink-900">
                  <div className="font-bold">{order.address.label}</div>
                  <div className="mt-1 text-ink-700">
                    {[order.address.district, order.address.khoroo, order.address.detail]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
                {order.driver_notes && (
                  <div className="mt-3 rounded-lg bg-lime-50 p-2.5 text-xs text-ink-700">
                    💬 <strong>Жолоочид:</strong> {order.driver_notes}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 flex justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
