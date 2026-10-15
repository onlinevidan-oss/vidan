import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { KpiCard } from "@/components/admin/KpiCard";
import { EbarimtRefresh } from "@/components/admin/EbarimtRefresh";
import { createClient } from "@/lib/supabase/server";
import { formatMnt, formatPhone } from "@/lib/utils";
import { formatUbDateTime, ubAddDays, ubDateKey, ubDayStart } from "@/lib/datetime";
import {
  EBARIMT_CHECK_LABEL,
  EBARIMT_START_DATE,
  ebarimtCheck,
  summarizeEbarimt,
  type EbarimtCheck,
} from "@/lib/ebarimt/check";

export const metadata = { title: "И-баримт | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const FILTERS = ["all", "ok", "mismatch", "unchecked", "missing"] as const;
type Filter = (typeof FILTERS)[number];

const CHECK_STYLE: Record<EbarimtCheck, string> = {
  ok: "bg-[#e3f5ea] text-[#2da764]",
  mismatch: "bg-brand-100 text-brand-700",
  unchecked: "bg-ink-100 text-ink-500",
  missing: "bg-[#fff3d6] text-[#9a6200]",
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** И-баримтын НӨАТ-ын бутархай — 8,490.91 */
function vat(n: number | null): string {
  if (n === null) return "—";
  return `₮${n.toLocaleString("mn-MN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminEbarimt({
  searchParams,
}: PageProps<"/admin/ebarimt">) {
  const sp = await searchParams;
  const today = ubDateKey();
  const from =
    typeof sp.from === "string" && DATE_KEY.test(sp.from) ? sp.from : EBARIMT_START_DATE;
  const to = typeof sp.to === "string" && DATE_KEY.test(sp.to) ? sp.to : today;
  const filter: Filter = (FILTERS as readonly string[]).includes(String(sp.f))
    ? (sp.f as Filter)
    : "all";

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, status, total, contact_phone, ebarimt_id, ebarimt_type, ebarimt_customer_tin, ebarimt_consumer_no, ebarimt_lottery, ebarimt_amount, ebarimt_vat, ebarimt_city_tax, ebarimt_status, ebarimt_checked_at",
    )
    .eq("payment_status", "paid")
    .gte("created_at", ubDayStart(from).toISOString())
    .lt("created_at", ubDayStart(ubAddDays(to, 1)).toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  const all = (data ?? []).map((o) => ({
    ...o,
    total: Number(o.total),
    ebarimt_amount: o.ebarimt_amount === null ? null : Number(o.ebarimt_amount),
    ebarimt_vat: o.ebarimt_vat === null ? null : Number(o.ebarimt_vat),
    ebarimt_city_tax: o.ebarimt_city_tax === null ? null : Number(o.ebarimt_city_tax),
  }));
  const summary = summarizeEbarimt(all);
  const rows = filter === "all" ? all : all.filter((o) => ebarimtCheck(o) === filter);

  const href = (f: Filter) => {
    const qs = new URLSearchParams();
    if (from !== EBARIMT_START_DATE) qs.set("from", from);
    if (to !== today) qs.set("to", to);
    if (f !== "all") qs.set("f", f);
    const s = qs.toString();
    return s ? `/admin/ebarimt?${s}` : "/admin/ebarimt";
  };

  return (
    <>
      <TopBar title="И-баримт" crumb={`${from} → ${to}`} />
      <div className="flex-1 space-y-5 p-4 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              И-баримтын жагсаалт
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Төлөгдсөн захиалга бүрд ямар дүнгээр баримт үүссэнийг QPay-ийн
              бүртгэлээс харуулна
            </div>
          </div>
          <EbarimtRefresh
            orderIds={all.filter((o) => o.ebarimt_id).map((o) => o.id)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Баримт үүссэн"
            value={`${summary.withReceipt} / ${summary.orders}`}
            delta={summary.missing > 0 ? `${summary.missing} нь баримтгүй` : "бүгд баримттай"}
            trend={summary.missing > 0 ? "down" : "flat"}
            icon="🧾"
            tone="info"
          />
          <KpiCard
            label="Баримтын нийт дүн"
            value={formatMnt(summary.receiptTotal)}
            delta="QPay-ийн бүртгэлээр"
            trend="flat"
            icon="💰"
            tone="brand"
          />
          <KpiCard
            label="Үүнд НӨАТ"
            value={vat(summary.vatTotal)}
            delta="баримтуудын нийлбэр"
            trend="flat"
            icon="🏛"
            tone="lime"
          />
          <KpiCard
            label="Зөрүү"
            value={String(summary.mismatch)}
            delta={
              summary.mismatch > 0
                ? "баримт ≠ төлсөн дүн"
                : summary.unchecked > 0
                  ? `${summary.unchecked} шалгаагүй`
                  : "бүгд таарсан"
            }
            trend={summary.mismatch > 0 ? "down" : "flat"}
            icon="⚖️"
            tone="warn"
          />
        </div>

        <form
          action="/admin/ebarimt"
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-ink-200 bg-white p-3"
        >
          {filter !== "all" && <input type="hidden" name="f" value={filter} />}
          <label className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Эхлэх
            </span>
            <input type="date" name="from" defaultValue={from} className={INPUT} />
          </label>
          <label className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-500">
              Дуусах
            </span>
            <input type="date" name="to" defaultValue={to} className={INPUT} />
          </label>
          <button
            type="submit"
            className="rounded-[10px] bg-ink-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-ink-700"
          >
            Харах
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const n = f === "all" ? summary.orders : summary[f];
            const label = f === "all" ? "Бүгд" : EBARIMT_CHECK_LABEL[f];
            return (
              <Link
                key={f}
                href={href(f)}
                className={
                  filter === f
                    ? "rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white"
                    : "rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
                }
              >
                {label} ({n})
              </Link>
            );
          })}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
          {rows.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">🧾</div>
              <div className="font-display text-base font-bold text-ink-700">
                Энэ хугацаанд тохирох захиалга алга
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[880px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-200 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-3">Захиалга</th>
                  <th className="px-4 py-3">Баримт</th>
                  <th className="px-4 py-3 text-right">Төлсөн дүн</th>
                  <th className="px-4 py-3 text-right">Баримтын дүн</th>
                  <th className="px-4 py-3 text-right">НӨАТ</th>
                  <th className="px-4 py-3">Сугалаа</th>
                  <th className="px-4 py-3">Шалгалт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((o) => {
                  const check = ebarimtCheck(o);
                  const isCompany = o.ebarimt_type === "B2B_RECEIPT";
                  return (
                    <tr key={o.id} className="align-top transition hover:bg-cream">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-display font-extrabold text-ink-900 hover:text-brand-700"
                        >
                          {o.order_number}
                        </Link>
                        <div className="text-[11px] text-ink-500">
                          {formatUbDateTime(o.created_at, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {o.status === "cancelled" && (
                          <div className="text-[11px] font-bold text-brand-700">
                            Захиалга цуцлагдсан
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {o.ebarimt_id ? (
                          <>
                            <div className="font-semibold text-ink-900">
                              {isCompany ? "🏢 Байгууллага" : "👤 Хувь хүн"}
                            </div>
                            <div className="text-[11px] text-ink-500">
                              {isCompany
                                ? `ТТД ${o.ebarimt_customer_tin ?? "—"}`
                                : o.contact_phone
                                  ? formatPhone(o.contact_phone)
                                  : "—"}
                            </div>
                            <div
                              className="max-w-[180px] truncate font-mono text-[10px] text-ink-400"
                              title={`ДДТД ${o.ebarimt_id}`}
                            >
                              {o.ebarimt_id}
                            </div>
                          </>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-display font-extrabold text-ink-900">
                        {formatMnt(o.total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-display font-extrabold text-ink-900">
                        {o.ebarimt_amount === null ? (
                          <span className="text-ink-300">—</span>
                        ) : (
                          formatMnt(o.ebarimt_amount)
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">
                        {vat(o.ebarimt_vat)}
                        {o.ebarimt_city_tax ? (
                          <div className="text-[11px] text-ink-500">
                            НХАТ {vat(o.ebarimt_city_tax)}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-700">
                        {o.ebarimt_lottery ?? <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CHECK_STYLE[check]}`}
                        >
                          {EBARIMT_CHECK_LABEL[check]}
                        </span>
                        {o.ebarimt_status && o.ebarimt_status !== "REGISTERED" && (
                          <div className="mt-1 text-[11px] font-bold text-brand-700">
                            QPay: {o.ebarimt_status}
                          </div>
                        )}
                        {o.ebarimt_checked_at && (
                          <div className="mt-1 text-[10px] text-ink-400">
                            {formatUbDateTime(o.ebarimt_checked_at, {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            шалгасан
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-700">
          <strong className="text-ink-900">Тайлбар:</strong> «Баримтын дүн», «НӨАТ»
          нь QPay-д бүртгэгдсэн баримтаас шууд авсан утга. Барааны үнэ НӨАТ-тэй
          тул баримтын НӨАТ нь нийт дүнгийн ойролцоогоор 1/11 байна (захиалгын
          хуудсанд харагддаг «Хүргэлтийн НӨАТ» бол зөвхөн хүргэлт дээр нэмэгдсэн
          хэсэг). «Шалгаагүй» бол дээрх товчоор QPay-ээс уншина. Жагсаалт
          төлөгдсөн захиалгыг л харуулна.
        </div>
      </div>
    </>
  );
}

const INPUT =
  "w-full min-w-0 rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-brand-500";
