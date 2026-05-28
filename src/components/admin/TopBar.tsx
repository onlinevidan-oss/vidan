import Link from "next/link";

export function TopBar({
  title,
  crumb,
}: {
  title: string;
  crumb?: string;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-6 border-b border-ink-200 bg-white px-7">
      <div className="font-display text-lg font-extrabold text-ink-900">
        {title}
        {crumb && (
          <span className="ml-1.5 text-sm font-medium text-ink-500">
            / {crumb}
          </span>
        )}
      </div>

      <div className="relative ml-auto hidden md:block w-[320px]">
        <input
          type="text"
          placeholder="Бүгдийг хайх..."
          className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-ink-100 px-3.5 py-2.5 pl-9 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-50">
          🔍
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button className="relative grid h-9 w-9 place-items-center rounded-[10px] text-base transition hover:bg-ink-100">
          🔔
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
        </button>
        <button className="grid h-9 w-9 place-items-center rounded-[10px] text-base transition hover:bg-ink-100">
          ?
        </button>
        <div className="mx-1.5 h-6 w-px bg-ink-200" />
        <Link
          href="/"
          target="_blank"
          className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
        >
          ↗ Дэлгүүр харах
        </Link>
      </div>
    </header>
  );
}
