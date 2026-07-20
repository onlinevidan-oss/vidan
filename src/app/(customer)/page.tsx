import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/customer/ProductCard";
import {
  getCategoriesWithProductCount,
  getFeaturedProducts,
  getNewArrivals,
} from "@/lib/queries/products";
import { getHeroSettings } from "@/lib/queries/settings";

export const revalidate = 60; // ISR: 1 минут

export default async function HomePage() {
  const [categories, featured, newArrivals, hero] = await Promise.all([
    getCategoriesWithProductCount(),
    getFeaturedProducts(4),
    getNewArrivals(4),
    getHeroSettings(),
  ]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="my-6 md:my-8">
        {/* Нэгдмэл банер: зураг дүүрэн, badge дээд буланд тусад нь,
            гарчиг+товч доор нь — хооронд нь амьсгалын зай өгсөн. */}
        <div className="relative overflow-hidden rounded-[16px] bg-ink-900 min-h-[460px] sm:min-h-0 sm:aspect-[1640/720]">
          {hero.image_url && (
            <Image
              src={hero.image_url}
              alt=""
              fill
              className="pointer-events-none object-cover object-center"
              unoptimized={hero.image_url.startsWith("http")}
              priority
            />
          )}
          {/* Утсан дээр доороос, desktop дээр зүүнээс gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/60 to-ink-900/20 sm:bg-gradient-to-r sm:from-ink-900/90 sm:via-ink-900/45 sm:to-transparent" />

          {/* Badge — дээд буланд тусад нь */}
          <div className="absolute left-6 top-6 sm:left-12 sm:top-12">
            <span className="inline-flex w-max items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur">
              {hero.badge}
            </span>
          </div>

          {/* Гарчиг + товч — доор нь, badge-ээс тусдаа, амьсгалын зайтай */}
          <div className="absolute inset-0 flex items-end sm:items-center">
            <div className="max-w-[540px] p-6 pb-9 sm:p-12 text-white">
              <h1 className="font-display max-w-[440px] whitespace-pre-line text-[26px] md:text-[34px] font-extrabold leading-[1.2] tracking-tight">
                {hero.title}
              </h1>
              <p className="mt-3 max-w-[380px] text-sm leading-relaxed text-white/75 hidden sm:block">
                {hero.body}
              </p>
              <Link
                href={hero.btn_href}
                className="mt-6 inline-block w-max rounded-[10px] bg-white px-6 py-3 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-lime-500"
              >
                {hero.btn_label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CATEGORIES (DB) ============ */}
      <section className="my-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-ink-900">
              Ангилалаар үзэх
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              VIDAN брэндийн бүтээгдэхүүнүүд
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Бүгдийг харах
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="group rounded-[12px] border border-ink-200 bg-white px-4 py-5 text-center transition hover:border-brand-300 hover:shadow-[var(--shadow-brand-sm)]"
            >
              <div className="text-sm font-semibold text-ink-900 transition group-hover:text-brand-600">
                {c.name_mn}
              </div>
              <div className="mt-1 text-[11px] text-ink-500">
                {c.product_count} бүтээгдэхүүн
              </div>
            </Link>
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
          ["Байгалийн орц", "Хүнсний нэмэлтгүй"],
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
