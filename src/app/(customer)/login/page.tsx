import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/customer/LoginForm";
import Image from "next/image";

export const metadata = { title: "Нэвтрэх | VIDAN" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/");

  return (
    <div className="-mx-5 grid min-h-[calc(100vh-200px)] md:grid-cols-2">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-12 text-white md:flex md:flex-col md:justify-between">
        <Image src="/vidan-logo.png" alt="VIDAN" width={134} height={60} />
        <div className="relative z-10">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3.5 py-1.5 text-xs font-bold text-ink-900 shadow">
            🌱 1998 оноос үндэсний үйлдвэрлэл
          </span>
          <h1 className="font-display mb-4 max-w-[460px] text-4xl font-black leading-[1.1] tracking-tight">
            Тавтай морил,
            <br />
            эрүүл хүнсний гэрт
          </h1>
          <p className="max-w-[420px] text-[15px] opacity-90">
            VIDAN брэндийн 100% цэвэр бүтээгдэхүүн, шинэ хямдрал болон таны
            захиалгын мэдээллийг нэг дороос.
          </p>
        </div>
        <div className="relative z-10 flex flex-col gap-3.5">
          {[
            "Хурдан хүргэлт — Улаанбаатарт 2 цагт",
            "Захиалгын түүх, дуртай бараа хадгалах",
            "VIP хэрэглэгчийн онцгой хямдрал",
          ].map((t) => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-lime-500 font-extrabold text-ink-900">
                ✓
              </div>
              {t}
            </div>
          ))}
        </div>
        <Image
          src="/vidan-leaf.png"
          alt=""
          width={360}
          height={360}
          className="pointer-events-none absolute -bottom-12 -right-12 opacity-50 -rotate-[20deg] scale-[1.6]"
        />
      </aside>

      {/* Right form */}
      <section className="flex items-center justify-center p-8 md:p-12">
        <LoginForm />
      </section>
    </div>
  );
}
