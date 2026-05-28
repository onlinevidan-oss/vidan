"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const MAIN_NAV = [
  { href: "/admin",            label: "Хяналтын самбар", icon: "📊" },
  { href: "/admin/orders",     label: "Захиалга",        icon: "📦", badge: 0 },
  { href: "/admin/products",   label: "Бүтээгдэхүүн",    icon: "🛒" },
  { href: "/admin/customers",  label: "Хэрэглэгч",       icon: "👥" },
];

const OTHER_NAV = [
  { href: "/admin/categories", label: "Ангилал",         icon: "🏷️" },
  { href: "/admin/promotions", label: "Урамшуулал",      icon: "🎁" },
  { href: "/admin/reports",    label: "Тайлан",          icon: "📈" },
  { href: "/admin/settings",   label: "Тохиргоо",        icon: "⚙️" },
];

export function Sidebar({
  user,
}: {
  user: { fullName: string; role: string; initials: string };
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-4 bg-ink-900 p-3.5 text-white/85">
      {/* Logo */}
      <Link
        href="/admin"
        className="mb-1 inline-block w-max rounded-[10px] bg-white p-2"
      >
        <Image src="/vidan-logo.png" alt="VIDAN" width={85} height={38} />
      </Link>

      <NavSection title="Үндсэн" items={MAIN_NAV} isActive={isActive} />
      <NavSection title="Бусад" items={OTHER_NAV} isActive={isActive} />

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
  );
}

function NavSection({
  title,
  items,
  isActive,
}: {
  title: string;
  items: { href: string; label: string; icon: string; badge?: number }[];
  isActive: (href: string) => boolean;
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
