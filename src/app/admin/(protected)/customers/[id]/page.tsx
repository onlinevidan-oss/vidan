import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { OrderCard } from "@/components/admin/OrderCard";
import { SEGMENT_LABEL, getCustomer } from "@/lib/queries/customers";
import { getCustomerOrders } from "@/lib/queries/orders";
import { formatMnt, formatPhone } from "@/lib/utils";
import { formatUbDate } from "@/lib/datetime";

export const metadata = { title: "Хэрэглэгч | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminCustomerDetail({
  params,
}: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [customer, orders] = await Promise.all([
    getCustomer(id),
    getCustomerOrders(id),
  ]);
  if (!customer) notFound();
  const { profile: p, addresses } = customer;

  const paid = orders.filter((o) => o.payment_status === "paid");
  const paidTotal = paid.reduce((s, o) => s + o.total, 0);
  const name = p.full_name || "Нэргүй хэрэглэгч";

  return (
    <>
      <TopBar title="Хэрэглэгч" crumb={name} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              {name}
              <span className="ml-2 rounded-full bg-lime-100 px-2.5 py-0.5 align-middle text-[11px] font-extrabold uppercase text-lime-700">
                {SEGMENT_LABEL[p.segment] ?? p.segment}
              </span>
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Бүртгүүлсэн: {formatUbDate(p.created_at)}
            </div>
          </div>
          <Link
            href="/admin/customers"
            className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            ← Буцах
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                Холбоо барих
              </h3>
              <dl className="space-y-2 text-[13px]">
                <Row label="Утас">
                  {p.phone ? (
                    <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="font-bold text-brand-700">
                      📞 {formatPhone(p.phone)}
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Имэйл">{p.email || "—"}</Row>
              </dl>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                Худалдан авалт
              </h3>
              <dl className="space-y-2 text-[13px]">
                <Row label="Төлөгдсөн захиалга">
                  <strong className="text-ink-900">{paid.length}</strong>
                </Row>
                <Row label="Төлсөн нийт дүн">
                  <strong className="text-ink-900">{formatMnt(paidTotal)}</strong>
                </Row>
                <Row label="Хүргэгдсэн">
                  {p.total_orders} · {formatMnt(p.total_spent)}
                </Row>
                <Row label="Төлөөгүй орхисон">
                  {orders.length - paid.length}
                </Row>
              </dl>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-5">
              <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
                Хүргэлтийн хаяг ({addresses.length})
              </h3>
              {addresses.length === 0 ? (
                <div className="text-[13px] text-ink-500">Хаяг бүртгээгүй</div>
              ) : (
                <ul className="space-y-2 text-[13px] text-ink-700">
                  {addresses.map((a) => (
                    <li key={a.id}>
                      {a.label && (
                        <span className="mr-1.5 inline-block rounded bg-lime-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-lime-700">
                          {a.label}
                        </span>
                      )}
                      📍 {[a.district, a.khoroo, a.detail].filter(Boolean).join(", ") || "—"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white">
            <div className="border-b border-ink-200 px-5 py-4">
              <h3 className="font-display text-[15px] font-extrabold text-ink-900">
                Захиалгын түүх ({orders.length})
              </h3>
            </div>
            {orders.length === 0 ? (
              <div className="grid place-items-center px-5 py-14 text-center">
                <div className="mb-3 text-4xl opacity-40">📦</div>
                <div className="font-display text-base font-bold text-ink-700">
                  Захиалга хийгээгүй
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
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right text-ink-700">{children}</dd>
    </div>
  );
}
