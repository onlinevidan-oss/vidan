import Link from "next/link";
import { formatMnt, formatPhone } from "@/lib/utils";
import { STATUS_LABEL, STATUS_STYLE, type OrderStatus } from "@/lib/order-status";
import type { AdminOrder } from "@/lib/queries/orders";

/**
 * Захиалгын бүтэн карт — дарж орохгүйгээр хэрэглэгч, утас, хаяг болон
 * захиалсан бараа нь зурагтайгаа шууд харагдана.
 *
 * Хяналтын самбар болон захиалгын жагсаалт хоёулаа үүнийг ашиглана.
 */
export function OrderCard({ order: o }: { order: AdminOrder }) {
  const pieces = o.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Link
      href={`/admin/orders/${o.id}`}
      className="block px-5 py-4 transition hover:bg-cream"
    >
      {/* Мөр 1 — дугаар, төлөв, дүн, цаг */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-display text-[15px] font-extrabold text-ink-900">
          {o.order_number}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status as OrderStatus] ?? "bg-ink-100 text-ink-500"}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
        </span>
        {o.payment_method && (
          <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
            {o.payment_method}
          </span>
        )}
        <span className="ml-auto font-display text-[15px] font-extrabold text-ink-900">
          {formatMnt(o.total)}
        </span>
        <span className="w-full text-[11px] text-ink-500 sm:w-auto">
          {new Date(o.created_at).toLocaleString("mn-MN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Мөр 2 — хэрэглэгч, утас, хаяг */}
      <div className="mt-2 space-y-0.5 text-[13px]">
        <div className="font-semibold text-ink-900">
          {o.customer_name || "Нэргүй хэрэглэгч"}
          {o.customer_phone ? (
            <span className="ml-2 font-bold text-brand-700">
              📞 {formatPhone(o.customer_phone)}
            </span>
          ) : (
            <span className="ml-2 text-[11px] font-bold text-brand-700">
              ⚠️ утасгүй
            </span>
          )}
          {o.customer_phone2 && (
            <span className="ml-1.5 text-xs text-ink-500">
              / {formatPhone(o.customer_phone2)}
            </span>
          )}
        </div>
        <div className="text-ink-500">
          {o.address_label && (
            <span className="mr-1.5 inline-block rounded bg-lime-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-lime-700">
              {o.address_label}
            </span>
          )}
          📍 {o.address || "Хаяг байхгүй"}
        </div>
      </div>

      {/* Мөр 3 — захиалсан бараа зурагтайгаа */}
      {o.items.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {o.items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white py-1 pl-1 pr-2.5"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-md bg-cream-100">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image_url}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs opacity-40">📦</span>
                )}
              </div>
              <span className="text-[12px] text-ink-700">
                {it.name}
                <strong className="ml-1 text-ink-900">×{it.quantity}</strong>
              </span>
            </div>
          ))}
          <span className="ml-1 text-[11px] font-bold text-ink-500">
            нийт {pieces} ш
          </span>
        </div>
      )}
    </Link>
  );
}
