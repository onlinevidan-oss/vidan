import Link from "next/link";
import { getAdminAlerts } from "@/lib/queries/admin-alerts";
import { TopBarTools } from "@/components/admin/TopBarTools";
import { NavToggle } from "@/components/admin/NavToggle";

export async function TopBar({
  title,
  crumb,
}: {
  title: string;
  crumb?: string;
}) {
  const alerts = await getAdminAlerts();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:gap-6 sm:px-7 print:hidden">
      <NavToggle />
      <div className="min-w-0 shrink truncate font-display text-lg font-extrabold text-ink-900">
        {title}
        {crumb && (
          <span className="ml-1.5 text-sm font-medium text-ink-500">
            / {crumb}
          </span>
        )}
      </div>

      <TopBarTools alerts={alerts} />

      <div className="hidden h-6 w-px shrink-0 bg-ink-200 sm:block" />
      <Link
        href="/"
        target="_blank"
        className="hidden shrink-0 rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 sm:block"
      >
        ↗ Дэлгүүр харах
      </Link>
    </header>
  );
}
