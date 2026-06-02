import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMnt } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";

export const metadata = { title: "Миний захиалга | VIDAN" };
export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, items:order_items(quantity)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">Нүүр</Link>
        <span>/</span>
        <span className="text-ink-700">Миний захиалга</span>
      </nav>
      <h1 className="mb-6 font-display text-3xl font-black tracking-tight text-ink-900">
        Миний захиалга
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border-[1.5px] border-dashed border-ink-200 bg-white p-16 text-center">
          <div className="mb-3 text-5xl opacity-40">📦</div>
          <h2 className="font-display text-lg font-bold text-ink-700">
            Захиалга хараахан байхгүй
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Та эхний захиалгаа хийгээгүй байна
          </p>
          <Link
            href="/products"
            className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Бараа үзэх
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const itemCount = (o.items as { quantity: number }[]).reduce(
              (s, i) => s + i.quantity,
              0,
            );
            return (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex items-center gap-5 rounded-2xl border border-ink-200 bg-white p-5 transition hover:border-brand-200 hover:shadow-[var(--shadow-brand-sm)]"
              >
                <div>
                  <div className="font-display text-base font-extrabold text-ink-900">
                    {o.order_number}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500">
                    {new Date(o.created_at).toLocaleString("mn-MN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="text-sm text-ink-700">{itemCount} бараа</div>
                <div className="font-display ml-auto font-extrabold text-ink-900">
                  {formatMnt(Number(o.total))}
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                    STATUS_STYLE[o.status as OrderStatus] ?? "bg-ink-100"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
