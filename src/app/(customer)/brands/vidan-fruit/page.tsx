import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatMnt } from "@/lib/utils";
import { FRUIT_BRAND, FRUIT_PREVIEW, FRUIT_PRODUCTS, type FruitProduct } from "@/lib/fruit-preview";

/**
 * Vidan fruit — ЗАГВАР хуудас. Туггүй орчинд (production) 404.
 * `[slug]` нь DB-ээс брэнд хайдаг тул энэ тогтмол зам түүнээс түрүүлж таарна.
 */

export const metadata: Metadata = {
  title: `${FRUIT_BRAND.name} — шинэхэн жимс`,
  robots: { index: false, follow: false },
};

export default function FruitPage() {
  if (!FRUIT_PREVIEW) notFound();

  return (
    <div className="my-6">
      <div className="mb-4 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-900">
        ЗАГВАР — хэрэглэгчдэд харагдахгүй. Захиалга, төлбөрийн урсгал захирлын шийдвэрийн дараа нээгдэнэ.
      </div>

      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-xs text-ink-500">
        <Link href="/">Нүүр</Link><span>/</span><span>{FRUIT_BRAND.name}</span>
      </nav>

      <header className="relative overflow-hidden rounded-2xl bg-brand-600 text-white">
        <Image
          src="/fruit/cover-jims2.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1240px) 100vw, 1240px"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#b81e22] via-[#b81e22]/80 via-45% to-transparent to-80%" />
        <div className="relative max-w-[560px] p-6 md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-900">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-900" /> Шинэхэн
          </span>
          <h1 className="font-display mt-3 text-3xl font-black leading-tight md:text-[42px]">
            Шинэхэн жимс — хайрцгаараа гэрт тань
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/90">
            Европын шинэхэн жимсийг хайрцгаар нь захиалаад гэртээ хүргүүлээрэй.
          </p>
        </div>
      </header>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold">Алим</h2>
          <span className="text-sm text-ink-500">{FRUIT_PRODUCTS.length} төрөл</span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {FRUIT_PRODUCTS.map((p) => (
            <FruitCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 rounded-[16px] border border-ink-200 bg-white p-6 sm:grid-cols-3">
        {[
          ["Шинэхэн", "Агуулахаас шууд хайрцгаар"],
          ["Хайрцгаар", "8–12 кг савлагаа"],
          ["Гэрт хүргэнэ", "Улаанбаатар хотод"],
        ].map(([t, d]) => (
          <div key={t} className="border-l-2 border-lime-500 pl-4">
            <h3 className="text-sm font-bold text-ink-900">{t}</h3>
            <p className="mt-1 text-xs text-ink-500">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FruitCard({ product: p }: { product: FruitProduct }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] bg-white">
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={p.image}
          alt={`${p.origin} алим ${p.variety}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        />
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-lime-600 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-ink-900">
          ШИНЭХЭН
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
          <span aria-hidden>{p.flag}</span> {p.origin} алим
        </div>
        <h3 className="mt-1 text-sm font-semibold text-ink-900">{p.variety}</h3>
        <div className="mt-0.5 mb-3 text-xs text-ink-500">{p.boxKg} кг хайрцаг</div>
        <div className="mt-auto">
          <div className="mb-2">
            <div className="font-display text-[17px] font-extrabold leading-tight text-ink-900">
              {formatMnt(p.pricePerBox)}
              <span className="text-xs font-semibold text-ink-500"> / хайрцаг</span>
            </div>
          </div>
          <button
            disabled
            title="Загвар — захиалга хараахан нээгдээгүй"
            className="h-[38px] w-full cursor-not-allowed rounded-[10px] bg-brand-600/60 text-[13px] font-extrabold text-white"
          >
            Сагслах
          </button>
        </div>
      </div>
    </div>
  );
}
