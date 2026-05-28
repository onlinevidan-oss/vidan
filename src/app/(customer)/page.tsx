import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/customer/ProductCard";
import {
  getCategoriesWithProductCount,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/queries/products";

export const revalidate = 60; // ISR: 1 минут

export default async function HomePage() {
  // Параллель татна — нэг round-trip
  const [categories, featured, newArrivals] = await Promise.all([
    getCategoriesWithProductCount(),
    getFeaturedProducts(4),
    getNewArrivals(4),
  ]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="my-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-brand-700 to-brand-500 p-8 md:p-12 text-white min-h-[340px] flex flex-col justify-center">
          <span className="mb-4 inline-flex w-max items-center gap-1.5 rounded-full bg-lime-500 px-3.5 py-1.5 text-xs font-bold text-ink-900 shadow-md">
            🌱 Үндэсний үйлдвэрлэл · 1998 оноос
          </span>
          <h1 className="font-display max-w-[520px] text-4xl md:text-5xl font-black leading-[1.1] tracking-tight">
            Эрүүл хөрсөнд
            <br />
            ургуулсан эрүүл хүнс
          </h1>
          <p className="my-3 max-w-[480px] text-base opacity-95 relative z-10">
            VIDAN брэндийн 100% цэвэр, хүнсний нэмэлтгүй даршилсан ногоо, жимсний
            чанамал болон хүүхдийн тэжээл — Монгол хөрсөнд ургуулсан түүхий
            эдээр.
          </p>
          <Link
            href="/products"
            className="w-max rounded-[10px] bg-white px-7 py-3.5 text-[15px] font-bold text-brand-700 shadow-lg transition hover:-translate-y-0.5 relative z-10"
          >
            Бүтээгдэхүүн үзэх →
          </Link>
          <Image
            src="/vidan-leaf.png"
            alt=""
            width={240}
            height={240}
            className="pointer-events-none absolute -bottom-10 right-10 opacity-90 -rotate-[15deg] scale-[1.4]"
          />
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/products?category=baby-food"
            className="relative flex min-h-[162px] flex-col justify-between rounded-[14px] bg-gradient-to-br from-lime-600 to-lime-700 p-6 text-ink-900"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">
                7 хоногийн онцлох
              </div>
              <h3 className="font-display mt-2 text-xl font-extrabold leading-tight">
                Хүүхдийн алимны нухаш −20%
              </h3>
            </div>
            <div className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/15 text-base">
              →
            </div>
          </Link>
          <Link
            href="/products?new=true"
            className="relative flex min-h-[162px] flex-col justify-between rounded-[14px] bg-gradient-to-br from-ink-900 to-ink-800 p-6 text-white"
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-lime-500">
                Шинээр гарсан
              </div>
              <h3 className="font-display mt-2 text-xl font-extrabold leading-tight">
                Үхрийн нүдтэй чанамал
              </h3>
            </div>
            <div className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/25 text-base">
              →
            </div>
          </Link>
        </div>
      </section>

      {/* ============ CATEGORIES (DB) ============ */}
      <section className="my-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl md:text-[28px] font-extrabold tracking-tight text-ink-900">
              Ангилалаар үзэх
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Бүх төрлийн VIDAN брэндийн бүтээгдэхүүнүүд
            </p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="group relative overflow-hidden rounded-[14px] border-[1.5px] border-transparent bg-white p-5 text-center transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-brand-md)]"
            >
              <span className="absolute left-0 right-0 top-0 h-1 origin-left scale-x-0 bg-lime-500 transition group-hover:scale-x-100" />
              <div className="text-4xl">{c.emoji ?? "🫙"}</div>
              <div className="mt-2 text-[13px] font-bold text-ink-900">
                {c.name_mn}
              </div>
              <div className="mt-0.5 text-[11px] text-ink-500">
                {c.product_count} бүтээгдэхүүн
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ FEATURED (DB) ============ */}
      <section className="my-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl md:text-[28px] font-extrabold tracking-tight text-ink-900">
              🔥 Хамгийн их зарагдсан
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Хэрэглэгчдийн дуртай бүтээгдэхүүнүүд
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <div className="my-8 grid grid-cols-2 gap-7 rounded-[14px] border-[1.5px] border-ink-200 bg-white p-7 lg:grid-cols-4">
        {[
          ["🚚", "Хурдан хүргэлт", "УБ хотод 2 цагт"],
          ["🌿", "Нэмэлтгүй цэвэр", "100% байгалийн"],
          ["🏆", "Чанарын баталгаа", "HACCP стандарт"],
          ["💳", "Аюулгүй төлбөр", "Картаар болон QR"],
        ].map(([em, t, d]) => (
          <div key={t} className="flex items-center gap-3.5">
            <div className="grid h-13 w-13 shrink-0 place-items-center rounded-xl bg-lime-100 text-2xl">
              {em}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-ink-900">{t}</h4>
              <p className="mt-0.5 text-xs text-ink-500">{d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ============ NEW ARRIVALS (DB) ============ */}
      <section className="my-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl md:text-[28px] font-extrabold tracking-tight text-ink-900">
              ⭐ Шинээр нэмэгдсэн
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Энэ сард шинээр нийлүүлэгдсэн бүтээгдэхүүнүүд
            </p>
          </div>
          <Link
            href="/products?new=true"
            className="text-sm font-bold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ============ BRAND STORY ============ */}
      <section className="relative my-12 overflow-hidden rounded-[14px] bg-gradient-to-br from-ink-900 to-ink-800 p-8 md:p-14 text-white">
        <div className="relative z-10">
          <div className="mb-3 text-[13px] font-extrabold uppercase tracking-widest text-lime-500">
            🌱 Бидний түүх
          </div>
          <h2 className="font-display mb-4 max-w-[620px] text-3xl md:text-[38px] font-black leading-tight tracking-tight">
            27 жилийн туршлага, нэг л зорилго — эрүүл хүнс
          </h2>
          <p className="mb-7 max-w-[620px] text-[15px] leading-relaxed opacity-85">
            Дөрвөн Өлзий ХХК нь 1996 оноос худалдааны салбарт, 1998 оноос VIDAN
            хүнсний үйлдвэрээ нээж, өнөөдрийг хүртэл Монгол хүн бүрт баталгаатай,
            эрүүл хүнсийг өргөн барих эрхэм зорилгоор ажиллаж байна.
          </p>
          <Link
            href="/about"
            className="inline-block rounded-[10px] bg-white px-6 py-3.5 font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-lime-500"
          >
            Бидний тухай →
          </Link>
          <div className="relative z-10 mt-9 flex flex-wrap gap-12">
            <Stat n="27+" l="жилийн туршлага" />
            <Stat n="30+" l="төрлийн бүтээгдэхүүн" />
            <Stat n="100%" l="нэмэлтгүй цэвэр" />
            <Stat n="HACCP" l="олон улсын стандарт" />
          </div>
        </div>
        <Image
          src="/vidan-leaf.png"
          alt=""
          width={280}
          height={280}
          className="pointer-events-none absolute -bottom-10 right-8 opacity-25 -rotate-[15deg] scale-[1.8]"
        />
      </section>
    </>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-4xl font-black leading-none text-lime-500">
        {n}
      </div>
      <div className="mt-1.5 text-[13px] opacity-85">{l}</div>
    </div>
  );
}
