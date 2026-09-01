import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/server";
import { getBrands } from "@/lib/queries/products";
import { UserMenu } from "@/components/customer/UserMenu";
import { CartButton } from "@/components/customer/CartButton";
import { SearchBox } from "@/components/customer/SearchBox";

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
  const [
    {
      data: { user },
    },
    brands,
  ] = await Promise.all([supabase.auth.getUser(), getBrands()]);

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

          <div className="hidden md:block flex-1 max-w-[580px]">
            <SearchBox />
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

        {/* Гар утас — хайлт тусдаа мөрөнд (дээд мөрөнд багтахгүй) */}
        <div className="pb-3 md:hidden">
          <SearchBox compact />
        </div>

        <nav className="border-t border-ink-200 overflow-x-auto">
          <div className="flex gap-1 py-2.5 whitespace-nowrap">
            <CatChip href="/products" label="Бүгд" />
            {brands.map((b) => (
              <CatChip
                key={b.id}
                href={`/products?brand=${b.slug}`}
                label={b.name}
              />
            ))}
            <CatChip href="/products?new=true" label="Шинэ" />
          </div>
        </nav>
      </div>
    </header>
  );
}
