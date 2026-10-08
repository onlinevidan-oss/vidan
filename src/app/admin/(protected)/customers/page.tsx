import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  CUSTOMER_SORTS,
  CUSTOMERS_PAGE_SIZE,
  SEGMENT_LABEL,
  getCustomersPage,
  getCustomerStats,
  type CustomerSort,
} from "@/lib/queries/customers";
import { formatMnt, formatPhone } from "@/lib/utils";
import { formatUbDate } from "@/lib/datetime";

export const metadata = { title: "Хэрэглэгч | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const SORT_LABEL: Record<CustomerSort, string> = {
  newest: "Шинээр бүртгүүлсэн",
  spent: "Их худалдан авсан",
  orders: "Олон захиалсан",
};

function hrefOf(p: { q?: string; sort: CustomerSort; page?: number }): string {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.sort !== "newest") qs.set("sort", p.sort);
  if (p.page && p.page > 1) qs.set("page", String(p.page));
  const s = qs.toString();
  return s ? `/admin/customers?${s}` : "/admin/customers";
}

export default async function AdminCustomers({
  searchParams,
}: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 60) || undefined;
  const sort: CustomerSort = (CUSTOMER_SORTS as readonly string[]).includes(
    typeof sp.sort === "string" ? sp.sort : "",
  )
    ? (sp.sort as CustomerSort)
    : "newest";
  const n = Math.trunc(Number(typeof sp.page === "string" ? sp.page : 1));
  const page = Number.isFinite(n) && n >= 1 ? n : 1;

  const [stats, list] = await Promise.all([
    getCustomerStats(),
    getCustomersPage({ search: q, sort, page }),
  ]);
  if (list.rows.length === 0 && page > 1) redirect(hrefOf({ q, sort }));

  const firstRow = (page - 1) * CUSTOMERS_PAGE_SIZE + 1;

  return (
    <>
      <TopBar title="Хэрэглэгч" crumb={q ? `"${q}"` : "Бүгд"} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Хэрэглэгчид
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Сайтад бүртгүүлсэн хүмүүс ба тэдний худалдан авалт
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Нийт хэрэглэгч" value={String(stats.total)} delta="бүртгэлтэй" trend="flat" icon="👥" tone="info" />
          <KpiCard label="Худалдан авсан" value={String(stats.buyers)} delta="захиалга хүргэгдсэн" trend={stats.buyers > 0 ? "up" : "flat"} icon="🛍" tone="lime" />
          <KpiCard label="Шинэ хэрэглэгч" value={String(stats.newThisMonth)} delta="энэ сар" trend={stats.newThisMonth > 0 ? "up" : "flat"} icon="✨" tone="brand" />
        </div>

        <form
          action="/admin/customers"
          className="mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-ink-200 bg-white p-3"
        >
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Хайх
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Нэр, утас, имэйл"
              className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-brand-500"
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Эрэмбэ
            </span>
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-brand-500"
            >
              {CUSTOMER_SORTS.map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-[10px] bg-ink-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-ink-700"
          >
            Хайх
          </button>
          {q && (
            <Link
              href={hrefOf({ sort })}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              Цэвэрлэх
            </Link>
          )}
        </form>

        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          {list.rows.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">👥</div>
              <div className="font-display text-base font-bold text-ink-700">
                {q ? "Хайлтад таарах хэрэглэгч олдсонгүй" : "Хэрэглэгч алга"}
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-200 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Хэрэглэгч</th>
                  <th className="px-4 py-3">Утас</th>
                  <th className="px-4 py-3 text-right">Хүргэгдсэн захиалга</th>
                  <th className="px-4 py-3 text-right">Нийт дүн</th>
                  <th className="px-4 py-3">Сүүлийн захиалга</th>
                  <th className="px-4 py-3">Бүртгүүлсэн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {list.rows.map((c) => (
                  <tr key={c.id} className="transition hover:bg-cream">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-bold text-ink-900 hover:text-brand-700"
                      >
                        {c.full_name || "Нэргүй хэрэглэгч"}
                      </Link>
                      {c.segment !== "new" && (
                        <span className="ml-2 rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-lime-700">
                          {SEGMENT_LABEL[c.segment] ?? c.segment}
                        </span>
                      )}
                      {c.email && (
                        <div className="text-[11px] text-ink-500">{c.email}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-700">
                      {c.phone ? formatPhone(c.phone) : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-display font-extrabold text-ink-900">
                      {c.total_orders > 0 ? c.total_orders : <span className="text-ink-300">0</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-display font-extrabold text-ink-900">
                      {c.total_spent > 0 ? formatMnt(c.total_spent) : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-700">
                      {c.last_order_at ? (
                        formatUbDate(c.last_order_at)
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">
                      {formatUbDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {list.total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
            <span>
              {firstRow}–{firstRow + list.rows.length - 1} / нийт {list.total}
            </span>
            {list.pages > 1 && (
              <div className="flex items-center gap-1.5">
                {page > 1 ? (
                  <Link href={hrefOf({ q, sort, page: page - 1 })} className={PAGE_BTN}>
                    ‹ Өмнөх
                  </Link>
                ) : (
                  <span className={`${PAGE_BTN} cursor-not-allowed text-ink-300`}>‹ Өмнөх</span>
                )}
                <span className="px-2 font-bold text-ink-900">
                  {page} / {list.pages}
                </span>
                {page < list.pages ? (
                  <Link href={hrefOf({ q, sort, page: page + 1 })} className={PAGE_BTN}>
                    Дараах ›
                  </Link>
                ) : (
                  <span className={`${PAGE_BTN} cursor-not-allowed text-ink-300`}>Дараах ›</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const PAGE_BTN =
  "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 font-bold text-ink-700";
