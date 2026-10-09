"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

/** Дээд мөрний ☰ товч энэ үйл явдлаар цэсийг нээж хаана (NavToggle) */
export const NAV_TOGGLE_EVENT = "admin:toggle-nav";

const MAIN_NAV = [
  { href: "/admin",            label: "Хяналтын самбар", icon: "📊" },
  { href: "/admin/orders",     label: "Захиалга",        icon: "📦" },
  { href: "/admin/products",   label: "Бүтээгдэхүүн",    icon: "🛒" },
  { href: "/admin/inventory",  label: "Агуулах",         icon: "🏬" },
  { href: "/admin/customers",  label: "Хэрэглэгч",       icon: "👥" },
];

const OTHER_NAV = [
  { href: "/admin/categories", label: "Ангилал",         icon: "🏷️" },
  { href: "/admin/promotions", label: "Урамшуулал",      icon: "🎁" },
  { href: "/admin/feedback",   label: "Санал хүсэлт",    icon: "💬" },
  { href: "/admin/reports",    label: "Тайлан",          icon: "📈" },
  { href: "/admin/traffic",    label: "Traffic",         icon: "🌐" },
  { href: "/admin/settings",   label: "Тохиргоо",        icon: "⚙️" },
];

/** Зөвхөн role = admin-д харагдана */
const OWNER_NAV = [
  { href: "/admin/staff",      label: "Ажилтан",         icon: "🧑‍💼" },
];

export function Sidebar({
  user,
  newOrders = 0,
}: {
  user: { fullName: string; role: string; initials: string };
  /** Төлөгдсөн, хараахан бэлтгэж эхлээгүй захиалгын тоо */
  newOrders?: number;
}) {
  const pathname = usePathname();
  // Жижиг дэлгэцэд цэс далд байж, ☰ товчоор гулсаж гарна
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener(NAV_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(NAV_TOGGLE_EVENT, toggle);
  }, []);
  const close = () => setOpen(false);
  const mainNav = MAIN_NAV.map((item) =>
    item.href === "/admin/orders" ? { ...item, badge: newOrders } : item,
  );

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Цэсийг хаах"
          onClick={close}
          className="fixed inset-0 z-30 bg-black/50 md:hidden print:hidden"
        />
      )}
    <aside
      // Жижиг дэлгэцэд хаалттай үедээ `hidden` — transform-д найдахгүй:
      // хуучин гар утасны хөтөч `translate`-ийг танихгүй бол цэс дэлгэцийн
      // зүүн талыг үргэлж хааж, агуулга харагдахгүй болно.
      className={`fixed bottom-0 left-0 top-0 z-40 w-[260px] flex-col gap-4 overflow-y-auto bg-ink-900 p-3.5 text-white/85 md:sticky md:z-auto md:flex md:h-screen md:w-auto print:hidden ${open ? "flex" : "hidden"}`}
    >
      {/* Logo */}
      <Link
        href="/admin"
        onClick={close}
        className="mb-1 inline-block w-max rounded-[10px] bg-white p-2"
      >
        <Image src="/vidan-logo.png" alt="VIDAN" width={85} height={38} />
      </Link>

      <NavSection title="Үндсэн" items={mainNav} isActive={isActive} onNavigate={close} />
      <NavSection
        title="Бусад"
        items={user.role === "admin" ? [...OTHER_NAV, ...OWNER_NAV] : OTHER_NAV}
        isActive={isActive}
        onNavigate={close}
      />

      {/* User card at bottom */}
      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-white/5 p-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-500 text-sm font-extrabold text-ink-900">
          {user.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-white">
            {user.fullName}
          </div>
          <div className="text-[11px] capitalize text-white/50">{user.role}</div>
        </div>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            title="Гарах"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-brand-600 hover:text-white"
          >
            ⎋
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}

function NavSection({
  title,
  items,
  isActive,
  onNavigate,
}: {
  title: string;
  items: { href: string; label: string; icon: string; badge?: number }[];
  isActive: (href: string) => boolean;
  /** Холбоос дарагдахад — жижиг дэлгэцэд цэсийг хаана */
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="px-3 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-widest text-white/40">
        {title}
      </div>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={
              active
                ? "flex items-center gap-3 rounded-[10px] bg-brand-600 px-3 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(215,35,39,0.35)]"
                : "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/6 hover:text-white"
            }
          >
            <span className="w-5 text-center text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={
                  active
                    ? "rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-extrabold"
                    : "rounded-full bg-lime-500 px-2 py-0.5 text-[11px] font-extrabold text-ink-900"
                }
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
