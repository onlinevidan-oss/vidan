import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/customer/ProfileForm";

export const metadata = { title: "Миний мэдээлэл | VIDAN" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, full_name, gender, email, phone, birth_date, avatar_url, total_orders, total_spent",
    )
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Нүүр
        </Link>
        <span>/</span>
        <span className="text-ink-700">Миний мэдээлэл</span>
      </nav>

      <h1 className="mb-6 font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
        Миний мэдээлэл
      </h1>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <ProfileForm
          initial={{
            id: user.id,
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            full_name: profile?.full_name ?? null,
            gender: profile?.gender ?? null,
            email: profile?.email ?? user.email ?? null,
            phone: profile?.phone ?? null,
            birth_date: profile?.birth_date ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
        />

        <aside className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Миний захиалга
            </div>
            <div className="mt-2 font-display text-2xl font-black text-ink-900">
              {profile?.total_orders ?? 0}
            </div>
            <Link
              href="/account/orders"
              className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline"
            >
              Захиалгын түүх →
            </Link>
          </div>

          <div className="rounded-2xl border border-lime-300 bg-lime-50 p-5">
            <div className="font-display text-sm font-extrabold text-lime-700">
              🎁 Төрсөн өдрийн урамшуулал
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
              Төрсөн огноогоо бүртгүүлснээр төрсөн өдрөөр тань онцгой
              урамшуулал хүргэнэ.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
