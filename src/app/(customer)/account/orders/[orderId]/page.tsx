import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMnt } from "@/lib/utils";

export const metadata = { title: "Захиалгын дэлгэрэнгүй | VIDAN" };
export const dynamic = "force-dynamic";

const STATUS_FLOW = ["new", "preparing", "shipping", "delivered"] as const;

const STATUS_LABEL: Record<string, string> = {
  new: "Шинэ",
  preparing: "Бэлтгэж байна",
  shipping: "Жолоочид",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
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

  const currentStep = STATUS_FLOW.indexOf(order.status as (typeof STATUS_FLOW)[number]);
  const isCancelled = order.status === "cancelled";

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
          {/* Status timeline */}
          {!isCancelled ? (
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <h3 className="font-display mb-4 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                Захиалгын явц
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {STATUS_FLOW.map((s, idx) => {
                  const done = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={s} className="text-center">
                      <div
                        className={
                          done
                            ? isCurrent
                              ? "mx-auto grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-base text-white shadow-[0_0_0_4px_var(--color-brand-100)]"
                              : "mx-auto grid h-10 w-10 place-items-center rounded-full bg-lime-500 text-base text-ink-900"
                            : "mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-base text-ink-500"
                        }
                      >
                        {done && !isCurrent ? "✓" : idx + 1}
                      </div>
                      <div className={done ? "mt-1.5 text-[11px] font-bold text-ink-900" : "mt-1.5 text-[11px] text-ink-500"}>
                        {STATUS_LABEL[s]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
              <div className="font-display text-lg font-bold text-brand-700">
                ✕ Энэ захиалга цуцлагдсан
              </div>
              {order.cancelled_reason && (
                <p className="mt-1 text-xs text-ink-700">{order.cancelled_reason}</p>
              )}
            </div>
          )}

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
            <Row label="Төлөв" value={order.payment_status} />
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
