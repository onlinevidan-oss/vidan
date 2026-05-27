import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[var(--shadow-brand-sm)]">
      <div className="mx-auto max-w-[1240px] px-5">
        <div className="flex items-center gap-6 py-3">
          <Logo height={48} />

          <div className="hidden md:block flex-1 max-w-[580px] relative">
            <input
              type="text"
              placeholder="Бүтээгдэхүүн хайх... (жнь. өргөст хэмх, чанамал)"
              className="w-full rounded-full border-[1.5px] border-ink-200 bg-cream px-4 py-3 pl-11 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50">
              🔍
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              title="Дуртай"
              className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-lg transition hover:bg-lime-100"
            >
              ♡
            </button>
            <Link
              href="/cart"
              title="Сагс"
              className="relative grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-lg transition hover:bg-lime-100"
            >
              🛒
              <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white ring-2 ring-white">
                3
              </span>
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 hover:-translate-y-0.5"
            >
              Нэвтрэх
            </Link>
          </div>
        </div>

        <nav className="border-t border-ink-200 overflow-x-auto">
          <div className="flex gap-2 py-2.5 whitespace-nowrap">
            {[
              ["Бүгд", true],
              ["🥒 Даршилсан ногоо", false],
              ["🫙 Чанамал, компот", false],
              ["🍎 Алимны нухаш", false],
              ["👶 Хүүхдийн тэжээл", false],
              ["🥗 Ногооны салат", false],
              ["🎁 Бэлгийн багц", false],
              ["🔥 Хямдрал", false],
              ["⭐ Шинэ", false],
            ].map(([label, active]) => (
              <a
                key={label as string}
                href="#"
                className={
                  active
                    ? "rounded-full bg-brand-100 px-3.5 py-2 text-[13px] font-semibold text-brand-700"
                    : "rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-lime-100 hover:text-lime-700"
                }
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
