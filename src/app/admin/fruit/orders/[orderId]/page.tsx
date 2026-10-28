import Link from "next/link";
import { notFound } from "next/navigation";
import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { CourierEnterButton } from "@/components/admin/CourierEnterButton";
import { FruitOrderStatus } from "@/components/admin/FruitOrderStatus";
import { getFruitOrder, getFruitProductIds } from "@/lib/queries/fruit";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMnt, formatMntCents, formatPhone } from "@/lib/utils";
import { formatUbDateTime } from "@/lib/datetime";
import { vatBreakdown } from "@/lib/pricing";
import { canShowCourierEnter, type OrderStatus } from "@/lib/order-status";
import { STAFF_ROLE_LABEL, type StaffRole } from "@/lib/staff-rules";
import { markFruitCourierEntered } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Жимс орсон захиалга — эзний шийдвэрээр бүтнээр нь (VIDAN-ы шилтэй бараа
 * ч гэсэн) харагдана; холимог захиалгыг Vidan fruit хүргэдэг.
 * getFruitOrder нь жимсгүй захиалгад null буцаадаг → 404.
 */
export default async function FruitOrderDetail({ params }: PageProps<"/admin/fruit/orders/[orderId]">) {
  const { orderId } = await params;
  const [order, fruitIds] = await Promise.all([getFruitOrder(orderId), getFruitProductIds()]);
  if (!order) notFound();
  const fruit = new Set(fruitIds);

  const { data: staffList } = await createAdminClient().from("staff").select("id, full_name, role");
  const staffById = new Map((staffList ?? []).map((s) => [s.id, s]));

  const items = order.items as { id: string; product_id: string | null; product_name: string; quantity: number; unit_price: number; subtotal: number }[];
  const address = order.address as { label: string | null; district: string | null; khoroo: string | null; detail: string | null } | null;
  const user = (Array.isArray(order.user) ? order.user[0] : order.user) as { full_name: string | null; phone: string | null } | null;
  const events = (order.events as { id: string; description: string | null; event_type: string; created_at: string; created_by: string | null }[])
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const shippingGross = Number(order.shipping) + Number(order.tax);
  const split = vatBreakdown(Number(order.total));
  const phone = order.contact_phone ?? user?.phone ?? null;

  return (
    <>
      <FruitTopBar title="Захиалга" crumb={order.order_number} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Захиалга <span className="text-brand-700">{order.order_number}</span>
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              {formatUbDateTime(order.created_at)} · {order.payment_status === "paid" ? "✓ Төлөгдсөн" : "⏳ Төлөгдөөгүй"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canShowCourierEnter(order) && (
              <CourierEnterButton
                orderId={order.id}
                orderNumber={order.order_number}
                enteredAt={order.courier_entered_at}
                enteredBy={order.courier_entered_by_name}
                action={markFruitCourierEntered}
              />
            )}
            <Link
              href="/admin/fruit/orders"
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500"
            >
              ← Буцах
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-ink-200 bg-white">
              <div className="border-b border-ink-200 px-5 py-4">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
                  Бараа ({items.length})
                </h3>
              </div>
              <div className="divide-y divide-ink-100">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-ink-900">
                        {i.product_id && fruit.has(i.product_id) ? "🍎 " : ""}
                        {i.product_name}
                      </div>
                      <div className="text-xs text-ink-500">
                        {formatMnt(Number(i.unit_price))} × {i.quantity}
                      </div>
                    </div>
                    <div className="font-display shrink-0 font-extrabold text-ink-900">{formatMnt(Number(i.subtotal))}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="font-semibold text-ink-900">Хүргэлт</div>
                  <div className="font-display shrink-0 font-extrabold text-ink-900">
                    {shippingGross === 0 ? "Үнэгүй" : formatMnt(shippingGross)}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 border-t border-ink-200 px-5 py-4 text-sm">
                <Row label="НӨАТ-гүй дүн" value={formatMntCents(split.net)} />
                <Row label="НӨАТ" value={formatMntCents(split.vat)} />
                <div className="flex justify-between pt-1">
                  <span className="font-bold">Нийт</span>
                  <span className="font-display text-lg font-black text-brand-700">{formatMnt(Number(order.total))}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white">
              <div className="border-b border-ink-200 px-5 py-4">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">Үйл явдлын түүх</h3>
              </div>
              <div className="divide-y divide-ink-100">
                {events.map((e) => {
                  const who = e.created_by ? staffById.get(e.created_by) : null;
                  return (
                    <div key={e.id} className="px-5 py-3">
                      <div className="text-sm font-semibold text-ink-900">{e.description ?? e.event_type}</div>
                      <div className="text-xs text-ink-500">
                        {formatUbDateTime(e.created_at)}
                        {who && (
                          <span className="ml-2 font-semibold text-ink-700">
                            · {who.full_name} ({STAFF_ROLE_LABEL[who.role as StaffRole] ?? who.role})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <FruitOrderStatus orderId={order.id} status={order.status as OrderStatus} paid={order.payment_status === "paid"} />
            <div className="rounded-2xl border border-ink-200 bg-white p-5 text-sm">
              <h3 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">Хэрэглэгч</h3>
              <div className="font-bold text-ink-900">{user?.full_name || "Нэргүй хэрэглэгч"}</div>
              {phone && <div className="mt-1 font-bold text-brand-700">📞 {formatPhone(phone)}</div>}
              {order.contact_phone2 && <div className="text-ink-500">/ {formatPhone(order.contact_phone2)}</div>}
              {address && (
                <div className="mt-3 text-ink-700">
                  📍 {[address.district, address.khoroo, address.detail].filter(Boolean).join(", ")}
                </div>
              )}
              {order.driver_notes && <div className="mt-3 rounded-lg bg-cream p-2 text-xs">📝 {order.driver_notes}</div>}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold text-ink-900">{value}</span>
    </div>
  );
}
