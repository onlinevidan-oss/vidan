import { NavToggle } from "@/components/admin/NavToggle";

/**
 * Жимсний хэсгийн дээд мөр. VIDAN-ы TopBar-ыг ашиглахгүй — тэр нь
 * хайлт, хонхоор VIDAN-ы захиалга, үлдэгдэл, санал хүсэлтийг татдаг.
 */
export function FruitTopBar({ title, crumb }: { title: string; crumb?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:gap-6 sm:px-7 print:hidden">
      <NavToggle />
      <div className="min-w-0 shrink truncate font-display text-lg font-extrabold text-ink-900">
        🍎 {title}
        {crumb && <span className="ml-1.5 text-sm font-medium text-ink-500">/ {crumb}</span>}
      </div>
    </header>
  );
}
