"use client";

/**
 * Дээд мөрний хэрэгслүүд: бүгдийг хайх, хонх (анхаарах зүйлс), тусламж.
 *
 * Хонхны тоонууд серверээс (TopBar) props-оор ирдэг тул шинэ захиалга
 * орж хуудас шинэчлэгдэх бүрд (OrdersLive → router.refresh) өөрөө
 * шинэчлэгдэнэ.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminSearch,
  type AdminSearchResult,
} from "@/app/admin/(protected)/search-action";
import type { AdminAlerts } from "@/lib/queries/admin-alerts";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { formatMnt, formatPhone } from "@/lib/utils";

type Panel = "search" | "bell" | "help" | null;

const DEBOUNCE_MS = 250;

export function TopBarTools({ alerts }: { alerts: AdminAlerts }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const [term, setTerm] = useState("");
  const [result, setResult] = useState<AdminSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Гадна талд дарах, Esc — нээлттэй самбарыг хаана
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPanel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  // Бичихээ зогсоосны дараа хайна. Хуучин хариу шинийг дарахаас сэргийлж
  // effect цэвэрлэгдэхэд `stale` болгоно.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await adminSearch(q);
      if (stale) return;
      setResult(res);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term]);

  const q = term.trim();
  const shown = q.length >= 2 ? result : null;
  const first =
    shown?.orders[0]
      ? `/admin/orders/${shown.orders[0].id}`
      : shown?.products[0]
        ? `/admin/products/${shown.products[0].id}`
        : shown?.customers[0]
          ? `/admin/customers/${shown.customers[0].id}`
          : null;
  const nothing =
    shown !== null &&
    shown.orders.length + shown.products.length + shown.customers.length === 0;

  function go(href: string) {
    setPanel(null);
    setTerm("");
    setResult(null);
    router.push(href);
  }

  const items = [
    { n: alerts.newOrders, icon: "🆕", label: "Бэлтгэх шинэ захиалга", href: "/admin/orders?status=new" },
    { n: alerts.unpaidOrders, icon: "⏳", label: "Төлбөр хүлээж буй захиалга", href: "/admin/orders?view=unpaid" },
    { n: alerts.lowStock, icon: "⚠️", label: "Дуусах дөхсөн бараа", href: "/admin/products?status=low" },
    { n: alerts.openFeedback, icon: "💬", label: "Шийдээгүй санал хүсэлт", href: "/admin/feedback" },
  ].filter((i) => i.n > 0);

  return (
    <div ref={rootRef} className="ml-auto flex min-w-0 items-center gap-1.5">
      {/* Хайлт */}
      <div className="relative hidden w-[320px] md:block">
        <input
          type="search"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setPanel("search");
          }}
          onFocus={() => setPanel("search")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && first) go(first);
          }}
          placeholder="Захиалга, бараа, хэрэглэгч хайх…"
          aria-label="Бүгдийг хайх"
          className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-ink-100 px-3.5 py-2.5 pl-9 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-50">
          🔍
        </span>

        {panel === "search" && q.length >= 2 && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
            {shown === null ? (
              <div className="px-3 py-4 text-center text-xs text-ink-500">Хайж байна…</div>
            ) : nothing ? (
              <div className="px-3 py-4 text-center text-xs text-ink-500">
                {searching ? "Хайж байна…" : `"${q}" — юу ч олдсонгүй`}
              </div>
            ) : (
              <>
                {shown.orders.length > 0 && (
                  <Group title="Захиалга">
                    {shown.orders.map((o) => (
                      <Hit key={o.id} onClick={() => go(`/admin/orders/${o.id}`)}>
                        <span className="font-display font-extrabold text-ink-900">{o.number}</span>
                        <span className="text-ink-500">
                          {o.paid ? (STATUS_LABEL[o.status as OrderStatus] ?? o.status) : "Төлөгдөөгүй"}
                        </span>
                        <span className="ml-auto font-bold text-ink-900">{formatMnt(o.total)}</span>
                      </Hit>
                    ))}
                  </Group>
                )}
                {shown.products.length > 0 && (
                  <Group title="Бүтээгдэхүүн">
                    {shown.products.map((p) => (
                      <Hit key={p.id} onClick={() => go(`/admin/products/${p.id}`)}>
                        <span className={`truncate font-bold ${p.active ? "text-ink-900" : "text-ink-500"}`}>
                          {p.name}
                        </span>
                        <span className="ml-auto shrink-0 text-ink-500">
                          {p.sku} · {p.stock} ш
                        </span>
                      </Hit>
                    ))}
                  </Group>
                )}
                {shown.customers.length > 0 && (
                  <Group title="Хэрэглэгч">
                    {shown.customers.map((c) => (
                      <Hit key={c.id} onClick={() => go(`/admin/customers/${c.id}`)}>
                        <span className="truncate font-bold text-ink-900">
                          {c.name || "Нэргүй хэрэглэгч"}
                        </span>
                        {c.phone && (
                          <span className="ml-auto shrink-0 text-ink-500">{formatPhone(c.phone)}</span>
                        )}
                      </Hit>
                    ))}
                  </Group>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Хонх */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPanel(panel === "bell" ? null : "bell")}
          aria-label={`Анхаарах зүйлс${items.length > 0 ? ` (${items.length})` : ""}`}
          className="relative grid h-9 w-9 place-items-center rounded-[10px] text-base transition hover:bg-ink-100"
        >
          🔔
          {items.length > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
          )}
        </button>
        {panel === "bell" && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-200 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
            <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Анхаарах зүйлс
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-ink-500">
                ✓ Одоогоор анхаарах зүйл алга
              </div>
            ) : (
              items.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setPanel(null)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-ink-700 transition hover:bg-cream"
                >
                  <span className="text-base">{i.icon}</span>
                  <span className="flex-1 font-semibold">{i.label}</span>
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {i.n}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Тусламж */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPanel(panel === "help" ? null : "help")}
          aria-label="Тусламж"
          className="grid h-9 w-9 place-items-center rounded-[10px] text-base transition hover:bg-ink-100"
        >
          ?
        </button>
        {panel === "help" && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-200 bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Товч заавар
            </div>
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-ink-700">
              <li>
                <strong className="text-ink-900">📦 Захиалга.</strong> Картыг дарж
                нээгээд төлвийг «Бэлтгэж байна → Жолоочид → Хүргэгдсэн» гэж
                ахиулна. Шинэ захиалга төлөгдөхөд энэ дэлгэцэнд мэдэгдэл гарна.
              </li>
              <li>
                <strong className="text-ink-900">🏬 Агуулах.</strong> Үлдэгдлийг
                шууд засахгүй — «± Хөдөлгөөн» товчоор орлого, зарлага, тооллогын
                засвар бүртгэнэ.
              </li>
              <li>
                <strong className="text-ink-900">🛒 Шинэ бараа.</strong>{" "}
                Бүтээгдэхүүн → «Шинэ бүтээгдэхүүн». SKU автоматаар бөглөгдөнө;
                брэнд, и-баримтын кодыг заавал сонгоно.
              </li>
              <li>
                <strong className="text-ink-900">📈 Тайлан.</strong> Хугацаагаа
                сонгоод 🖨 товчоор A4-т хэвлэнэ.
              </li>
              <li>
                <strong className="text-ink-900">🔍 Хайлт.</strong> Дээрх талбарт
                захиалгын дугаар, утас, барааны нэр эсвэл SKU бичнэ.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function Hit({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-cream"
    >
      {children}
    </button>
  );
}
