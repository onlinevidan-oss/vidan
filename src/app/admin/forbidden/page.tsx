import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Хандах эрхгүй | VIDAN Backoffice" };

/**
 * Энэ хуудас admin layout-аас БУСАД render зайтай байх ёстой,
 * учир нь layout өөрөө "staff биш бол энэ руу redirect" гэж тохирсон —
 * хэрэв layout-д орвол infinite loop болно.
 *
 * Шийдэл: энэ файлд өөрийн layout байхгүй => /admin/forbidden дуудсан
 * хэрэглэгчид admin layout НЕ хэрэглэгдэнэ (Next.js нь layout/page
 * хосыг нийт зам дагуу хайдаг тул /admin/layout.tsx үргэлж дуудагдана).
 *
 * Тиймээс энд layout-д redirect хийхээс өмнө client-side render-гүй
 * inline check хийе.
 */
export default async function ForbiddenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="grid min-h-screen place-items-center bg-cream p-6">
      <div className="w-full max-w-[480px] rounded-2xl border border-ink-200 bg-white p-10 text-center shadow-[var(--shadow-brand-md)]">
        <div className="mb-4 text-6xl">🔒</div>
        <h1 className="font-display mb-3 text-2xl font-black tracking-tight text-ink-900">
          Хандах эрх алга
        </h1>
        <p className="mb-1 text-sm text-ink-700">
          {user
            ? "Энэ хэсэгт хандахын тулд та staff гишүүн байх шаардлагатай."
            : "Нэвтрэх шаардлагатай."}
        </p>
        {user?.email && (
          <p className="mb-6 text-xs text-ink-500">
            Идэвхтэй account: <strong>{user.email}</strong>
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-[10px] bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700"
          >
            Нүүр хуудас руу буцах
          </Link>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              Гарах ба өөр account-аар нэвтрэх
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
