import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/customer/ProductCard";
import { BrandCard } from "@/components/customer/BrandCard";
import {
  getBrandsWithProductCount,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/queries/products";
import { getHeroSlides } from "@/lib/queries/settings";
import { HeroCarousel } from "@/components/customer/HeroCarousel";

export const revalidate = 60; // ISR: 1 минут

export default async function HomePage() {
  const [brands, featured, newArrivals, slides] = await Promise.all([
    getBrandsWithProductCount(),
    getFeaturedProducts(4),
    getNewArrivals(4),
    getHeroSlides(),
  ]);

  return (
    <>
      {/* ============ HERO CAROUSEL ============ */}
      <HeroCarousel slides={slides} />

      {/* ============ BRANDS (DB) ============ */}
      <section className="my-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-ink-900">
              Брэндүүд
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Дөрвөн Өлзий ХХК-ийн брэндүүд
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Бүх бүтээгдэхүүн
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {brands.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      </section>

      {/* ============ FEATURED (DB) ============ */}
      <section className="my-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-ink-900">
              Онцлох бүтээгдэхүүн
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Хэрэглэгчдийн дуртай сонголт
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <div className="my-10 grid grid-cols-2 gap-x-8 gap-y-6 rounded-[16px] border border-ink-200 bg-white p-8 lg:grid-cols-4">
        {[
          ["Хүргэлт", "Улаанбаатар хотод 24 цагт"],
          ["Баталгаажсан", "Түүхий эд"],
          ["Чанарын баталгаа", "ISO 9001 стандарт"],
          ["Төлбөр", "Карт болон QPay"],
        ].map(([t, d]) => (
          <div key={t} className="border-l-2 border-lime-500 pl-4">
            <h4 className="text-sm font-bold text-ink-900">{t}</h4>
            <p className="mt-1 text-xs text-ink-500">{d}</p>
          </div>
        ))}
      </div>

      {/* ============ NEW ARRIVALS (DB) ============ */}
      <section className="my-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-ink-900">
              Шинээр нэмэгдсэн
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Саяхан нийлүүлэгдсэн бүтээгдэхүүнүүд
            </p>
          </div>
          <Link
            href="/products?new=true"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ============ BRAND STORY ============ */}
      <section className="relative my-14 overflow-hidden rounded-[16px] border border-ink-200 bg-white p-8 md:p-14">
        <div className="relative z-10">
          <div className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-lime-700">
            Бидний түүх
          </div>
          <h2 className="font-display mb-4 max-w-[640px] text-2xl md:text-[34px] font-extrabold leading-tight tracking-tight text-ink-900">
            Энэ жил 30 жилийн ойгоо тэмдэглэж байна
          </h2>
          <p className="mb-7 max-w-[620px] text-[15px] leading-relaxed text-ink-700">
            Дөрвөн Өлзий ХХК нь 1996 оноос худалдааны салбарт, 1998 оноос VIDAN
            хүнсний үйлдвэрээ нээснээс хойш өнөөдрийг хүртэл Монгол хүн бүрт
            баталгаатай, эрүүл хүнсийг өргөн барих эрхэм зорилгоор ажиллаж байна.
          </p>
          <Link
            href="/about"
            className="inline-block rounded-[10px] bg-ink-900 px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-600"
          >
            Бидний тухай
          </Link>
          <div className="relative z-10 mt-9 flex flex-wrap gap-x-12 gap-y-6">
            <Stat n="30 жил" l="үндэсний үйлдвэрлэл" />
            <Stat n="40+" l="төрлийн бүтээгдэхүүн" />
            <Stat n="100%" l="нэмэлтгүй цэвэр" />
            <Stat n="ISO 9001" l="чанарын стандарт" />
          </div>
        </div>
        <Image
          src="/vidan-leaf.png"
          alt=""
          width={280}
          height={280}
          className="pointer-events-none absolute -bottom-10 right-8 opacity-[0.06] -rotate-[15deg] scale-[1.8]"
        />
      </section>
    </>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl md:text-3xl font-black leading-none text-lime-700">
        {n}
      </div>
      <div className="mt-1.5 text-[13px] text-ink-500">{l}</div>
    </div>
  );
}
