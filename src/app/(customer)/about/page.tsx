import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAboutBrochure } from "@/lib/queries/settings";

export const metadata: Metadata = {
  title: "Бидний тухай | Дөрвөн Өлзий ХХК — VIDAN",
  description:
    "Дөрвөн Өлзий ХХК нь 1996 онд үүсгэн байгуулагдаж, 2008 оноос Польш технологиор эх орны хөрсний хүнсний ногоог нөөшилсөн ВИДАН брэндийн бүтээгдэхүүн үйлдвэрлэж байна. Компанийн танилцуулга.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Бидний тухай | Дөрвөн Өлзий ХХК — VIDAN",
    description: "Чанарыг эрхэмлэн, хөгжилд тэмүүлнэ — компанийн танилцуулга.",
    url: "/about",
    type: "website",
  },
};

// Танилцуулга солигдоход 5 минутын дотор шинэчлэгдэнэ
export const revalidate = 300;

export default async function AboutPage() {
  const brochure = await getAboutBrochure();

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Нүүр
        </Link>
        <span>/</span>
        <span className="text-ink-700">Бидний тухай</span>
      </nav>

      <h1 className="font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
        Бидний тухай
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Дөрвөн Өлзий ХХК-ийн албан ёсны танилцуулга
      </p>

      {brochure ? (
        <div className="mx-auto mt-7 max-w-[900px] space-y-4">
          {brochure.pages.map((page, i) => (
            <Image
              key={page.url}
              src={page.url}
              alt={`${brochure.title} — ${i + 1}-р хуудас`}
              width={page.width}
              height={page.height}
              sizes="(max-width: 940px) 100vw, 900px"
              unoptimized={page.url.startsWith("http")}
              priority={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              className="w-full rounded-[14px] border border-ink-200 bg-white shadow-[var(--shadow-brand-sm)]"
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-7 max-w-[620px] rounded-[16px] border border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
          Танилцуулга удахгүй нэмэгдэнэ.
        </div>
      )}

      {/* ============ CTA ============ */}
      <section className="my-14 rounded-[16px] bg-ink-900 p-8 text-white md:p-12">
        <h2 className="font-display text-2xl md:text-[30px] font-extrabold tracking-tight">
          Эх орны хөрснөөс таны гарт
        </h2>
        <p className="mt-2.5 max-w-[560px] text-[15px] leading-relaxed opacity-75">
          ВИДАН брэндийн бүтээгдэхүүнийг онлайнаар захиалж, Улаанбаатар хотод
          хүргүүлээрэй.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/products"
            className="rounded-[10px] bg-brand-600 px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            Бүтээгдэхүүн үзэх
          </Link>
          <Link
            href="/feedback"
            className="rounded-[10px] border-[1.5px] border-white/25 px-6 py-3.5 font-bold text-white transition hover:border-lime-500 hover:text-lime-500"
          >
            Холбоо барих
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/10 pt-6 text-[13px] opacity-70">
          <a href="tel:+97675752525">📞 7575-2525</a>
          <a href="mailto:info@durvun-ulzii.mn">✉️ info@durvun-ulzii.mn</a>
          <span>📍 Баянгол дүүрэг, 20-р хороо, Үйлдвэрийн баруун бүс ХД-50</span>
        </div>
      </section>
    </div>
  );
}
