import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { createClient } from "@/lib/supabase/server";
import { formatMnt, formatPhone } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";

export const metadata = { title: "Захиалга | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;

  const supabase = await createClient();

  // Counts by status — зөвхөн төлбөр баталгаажсан захиалгууд.
  // Төлбөр төлөгдөөгүй (pending) захиалга админд харагдахгүй.
  const { data: allOrders } = await supabase
    .from("orders")
    .select("status")
    .eq("payment_status", "paid");
  const counts: Record<string, number> = {};
  (allOrders ?? []).forEach((o) => {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  });
  const total = allOrders?.length ?? 0;

  // Filtered list — мөн зөвхөн төлөгдсөн
  let q = supabase
    .from("orders")
    .select(
      "id, order_number, total, status, payment_method, created_at, user:profiles(full_name, phone), address:addresses(label, district, khoroo, detail), items:order_items(quantity)",
    )
    .eq("payment_status", "paid")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status) q = q.eq("status", status);
  const { data: orders } = await q;

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
          {!orders || orders.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">📦</div>
              <div className="font-display text-base font-bold text-ink-700">
                Захиалга алга
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    <Th>№</Th>
                    <Th>Хэрэглэгч</Th>
                    <Th>Хүргэх хаяг</Th>
                    <Th>Бараа</Th>
                    <Th>Дүн</Th>
                    <Th>Төлбөр</Th>
                    <Th>Төлөв</Th>
                    <Th>Огноо</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const userObj = o.user as { full_name: string | null; phone: string | null } | null;
                    const addr = o.address as { label: string | null; district: string | null; khoroo: string | null; detail: string | null } | null;
                    const itemCount = (o.items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr key={o.id} className="border-t border-ink-100 hover:bg-cream">
                        <td className="px-4 py-3 font-display font-bold">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="text-brand-700 hover:underline"
                          >
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{userObj?.full_name || "—"}</div>
                          <div className="text-xs text-ink-500">
                            {userObj?.phone ? formatPhone(userObj.phone) : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {addr ? (
                            <div className="max-w-[260px]">
                              {addr.label && (
                                <div className="inline-block rounded bg-lime-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-lime-700">
                                  {addr.label}
                                </div>
                              )}
                              <div className="mt-1 text-xs leading-snug text-ink-700">
                                {[addr.district, addr.khoroo, addr.detail].filter(Boolean).join(", ")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-500">{itemCount} ш</td>
                        <td className="px-4 py-3 font-display font-bold">
                          {formatMnt(Number(o.total))}
                        </td>
                        <td className="px-4 py-3 text-xs uppercase text-ink-500">
                          {o.payment_method ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status as OrderStatus] ?? "bg-ink-100"}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {STATUS_LABEL[o.status as OrderStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-500">
                          {new Date(o.created_at).toLocaleString("mn-MN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="text-ink-500 hover:text-brand-700"
                          >
                            👁
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
      {children}
    </th>
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
