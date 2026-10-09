import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { OrderCard } from "@/components/admin/OrderCard";
import { getAdminOrdersPage, getOrderStatusCounts } from "@/lib/queries/orders";
import { STATUS_LABEL } from "@/lib/order-status";
import {
  ORDERS_PAGE_SIZE,
  orderListHref,
  parseOrderListParams,
} from "@/lib/order-list";

export const metadata = { title: "Захиалга | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  const filter = parseOrderListParams(await searchParams);

  const [{ counts, total, unpaid, unpaidAll }, list] = await Promise.all([
    getOrderStatusCounts(),
    getAdminOrdersPage(filter),
  ]);

  // Байхгүй хуудас (хуучин холбоос, шүүлтүүр солигдсон) — эхний хуудас руу
  if (list.orders.length === 0 && filter.page > 1) {
    redirect(orderListHref(filter, { page: 1 }));
  }

  const isUnpaid = filter.view === "unpaid";
  const filtered = !!(filter.search || filter.from || filter.to);
  const crumb = isUnpaid
    ? "Төлөгдөөгүй"
    : filter.status
      ? STATUS_LABEL[filter.status]
      : "Бүгд";
  const firstRow = (list.page - 1) * ORDERS_PAGE_SIZE + 1;
  const lastRow = firstRow + list.orders.length - 1;

  return (
    <>
      <TopBar title="Захиалга" crumb={crumb} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Захиалгын удирдлага
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Нийт <strong className="text-ink-900">{total}</strong> төлөгдсөн
              захиалга
              {unpaid > 0 && (
                <>
                  {" · "}
                  <strong className="text-[#9a6200]">{unpaid}</strong> нь төлбөр
                  хүлээж байна
                </>
              )}
            </div>
          </div>
        </div>

        {/* Хайлт ба огноо — GET форм тул шүүлтүүр URL-д хадгалагдана */}
        <form
          action="/admin/orders"
          className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-ink-200 bg-white p-3"
        >
          {isUnpaid && <input type="hidden" name="view" value="unpaid" />}
          {filter.status && <input type="hidden" name="status" value={filter.status} />}
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Хайх
            </span>
            <input
              type="search"
              name="q"
              defaultValue={filter.search ?? ""}
              placeholder="Захиалгын дугаар, утас, нэр"
              className={INPUT}
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Эхлэх
            </span>
            <input type="date" name="from" defaultValue={filter.from ?? ""} className={INPUT} />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Дуусах
            </span>
            <input type="date" name="to" defaultValue={filter.to ?? ""} className={INPUT} />
          </label>
          <button
            type="submit"
            className="rounded-[10px] bg-ink-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-ink-700"
          >
            Хайх
          </button>
          {filtered && (
            <Link
              href={orderListHref(filter, { search: undefined, from: undefined, to: undefined })}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              Цэвэрлэх
            </Link>
          )}
        </form>

        {/* Төлвийн чипүүд — хайлт, огнооны шүүлтүүрийг хадгална */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip
            href={orderListHref(filter, { view: "paid", status: undefined })}
            active={!isUnpaid && !filter.status}
            label={`Бүгд (${total})`}
          />
          {(["new", "preparing", "shipping", "delivered", "cancelled"] as const).map((s) => (
            <Chip
              key={s}
              href={orderListHref(filter, { view: "paid", status: s })}
              active={!isUnpaid && filter.status === s}
              label={`${STATUS_LABEL[s]} (${counts[s] ?? 0})`}
            />
          ))}
          <Chip
            href={orderListHref(filter, { view: "unpaid" })}
            active={isUnpaid}
            label={`⏳ Төлөгдөөгүй (${unpaidAll})`}
            tone="warn"
          />
        </div>

        {isUnpaid && (
          <div className="mb-3 rounded-xl bg-[#fff7e6] px-4 py-2.5 text-xs leading-relaxed text-[#8a5a00]">
            Захиалга үүсгээд төлбөрөө хийгээгүй хүмүүс —{" "}
            <strong>{unpaid}</strong> нь одоо төлбөр хүлээж байна, үлдсэн нь
            хугацаа дуусаад цуцлагдсан. Хүлээгдэж буй захиалгын эзэнтэй утсаар
            холбогдож сануулбал амжина.
          </div>
        )}

        <div className="rounded-2xl border border-ink-200 bg-white">
          {list.orders.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">📦</div>
              <div className="font-display text-base font-bold text-ink-700">
                {filtered ? "Хайлтад таарах захиалга олдсонгүй" : "Захиалга алга"}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {list.orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          )}
        </div>

        {list.total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
            <span>
              {firstRow}–{lastRow} / нийт {list.total}
            </span>
            {list.pages > 1 && (
              <div className="flex items-center gap-1.5">
                <PageLink
                  href={orderListHref(filter, { page: list.page - 1 })}
                  disabled={list.page <= 1}
                  label="‹ Өмнөх"
                />
                <span className="px-2 font-bold text-ink-900">
                  {list.page} / {list.pages}
                </span>
                <PageLink
                  href={orderListHref(filter, { page: list.page + 1 })}
                  disabled={list.page >= list.pages}
                  label="Дараах ›"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const INPUT =
  "w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-brand-500";

function Chip({
  href,
  active,
  label,
  tone,
}: {
  href: string;
  active: boolean;
  label: string;
  tone?: "warn";
}) {
  const on =
    tone === "warn"
      ? "rounded-full bg-[#e89823] px-3.5 py-1.5 text-xs font-bold text-white"
      : "rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white";
  const off =
    tone === "warn"
      ? "rounded-full border-[1.5px] border-[#f0c36d] bg-[#fff7e6] px-3.5 py-1.5 text-xs font-bold text-[#8a5a00] transition hover:border-[#e89823]"
      : "rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700";
  return (
    <Link href={href} className={active ? on : off}>
      {label}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  const cls =
    "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 font-bold";
  if (disabled) {
    return <span className={`${cls} cursor-not-allowed text-ink-300`}>{label}</span>;
  }
  return (
    <Link href={href} className={`${cls} text-ink-700 transition hover:border-brand-500 hover:text-brand-700`}>
      {label}
    </Link>
  );
}
