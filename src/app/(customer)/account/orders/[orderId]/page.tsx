import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMnt } from "@/lib/utils";
import { type OrderStatus } from "@/lib/order-status";
import { OrderStatusTracker } from "@/components/customer/OrderStatusTracker";

export const metadata = { title: "Захиалгын дэлгэрэнгүй | VIDAN" };
export const dynamic = "force-dynamic";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Хүлээгдэж буй",
  paid: "Төлөгдсөн",
  failed: "Амжилтгүй",
  refunded: "Буцаагдсан",
};

export default async function CustomerOrderDetail({
  params,
}: PageProps<"/account/orders/[orderId]">) {
  const { orderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders/" + orderId);

  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*), address:addresses(*)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/account/orders" className="hover:text-brand-700">Миний захиалга</Link>
        <span>/</span>
        <span className="text-ink-700">{order.order_number}</span>
      </nav>
      <h1 className="mb-1 font-display text-3xl font-black tracking-tight text-ink-900">
        Захиалга <span className="text-brand-700">{order.order_number}</span>
      </h1>
      <div className="mb-6 text-sm text-ink-500">
        {new Date(order.created_at).toLocaleString("mn-MN")}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {/* Захиалгын явц — REAL-TIME */}
          <OrderStatusTracker
            orderId={order.id}
            initialStatus={order.status as OrderStatus}
            initialPaymentStatus={order.payment_status}
            initialCancelledReason={order.cancelled_reason}
          />

          {/* Items */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-4 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Бараа ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((i) => (
                <div key={i.id} className="flex justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-ink-900">{i.product_name}</div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {formatMnt(Number(i.unit_price))} × {i.quantity}
                    </div>
                  </div>
                  <div className="font-display font-extrabold text-ink-900">
                    {formatMnt(Number(i.subtotal))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <aside className="space-y-5">
          {/* Summary */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-4 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Дүн
            </h3>
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

          {/* Shipping */}
          {order.address && (
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                Хүргэх хаяг
              </h3>
              <div className="text-sm text-ink-700">
                <div className="font-bold text-ink-900">{order.address.label}</div>
                <div className="mt-1">
                  {[order.address.district, order.address.khoroo, order.address.detail]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Төлбөр
            </h3>
            <Row label="Арга" value={order.payment_method?.toUpperCase() ?? "—"} />
            <Row label="Төлөв" value={PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status} />
            {order.payment_method === "qpay" &&
              order.payment_status === "pending" &&
              order.status !== "cancelled" && (
                <Link
                  href={`/checkout/payment/${order.id}`}
                  className="mt-3 flex items-center justify-center rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
                >
                  📱 QPay-ээр төлөх
                </Link>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
