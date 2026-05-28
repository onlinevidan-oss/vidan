import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/customer/UserMenu";
import { CartButton } from "@/components/customer/CartButton";

function CatChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-700 transition hover:bg-lime-100 hover:text-lime-700"
    >
      {label}
    </Link>
  );
}

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; phone: string | null } | null = null;
  let isStaff = false;
  if (user) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("staff")
        .select("id")
        .eq("id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    profile = p;
    isStaff = !!s;
  }

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
            <CartButton />

            {user ? (
              <UserMenu
                name={profile?.full_name ?? null}
                phone={profile?.phone ?? user.phone ?? null}
                isStaff={isStaff}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 hover:-translate-y-0.5"
              >
                Нэвтрэх
              </Link>
            )}
          </div>
        </div>

        <nav className="border-t border-ink-200 overflow-x-auto">
          <div className="flex gap-2 py-2.5 whitespace-nowrap">
            <CatChip href="/products" label="Бүгд" />
            <CatChip href="/products?category=darshilsan"  label="🥒 Даршилсан ногоо" />
            <CatChip href="/products?category=jam"         label="🫙 Чанамал" />
            <CatChip href="/products?category=compote"     label="🥤 Компот" />
            <CatChip href="/products?category=apple-puree" label="🍎 Алимны нухаш" />
            <CatChip href="/products?category=baby-food"   label="👶 Хүүхдийн тэжээл" />
            <CatChip href="/products?category=gift-pack"   label="🎁 Бэлгийн багц" />
            <CatChip href="/products?sale=true"            label="🔥 Хямдрал" />
            <CatChip href="/products?new=true"             label="⭐ Шинэ" />
          </div>
        </nav>
      </div>
    </header>
  );
}
