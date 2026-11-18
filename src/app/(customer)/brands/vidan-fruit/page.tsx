import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMnt } from "@/lib/utils";
import { FruitCard } from "@/components/customer/FruitCard";
import { FRUIT_BRAND, FRUIT_DELIVERY_FEE, FRUIT_PREVIEW } from "@/lib/fruit-preview";
import { getFruitCatalog } from "@/lib/queries/fruit-public";
import { FruitBannerSlides } from "@/components/customer/FruitBannerSlides";
import { getPublicCommerceSettings, getFruitBanners } from "@/lib/queries/public-settings";

/**
 * "Жимс" хуудас — үнэ, үлдэгдэл сангаас (0053), баннер нь жимсний админы
 * тохиргооноос. `[slug]` нь DB-ээс брэнд хайдаг тул энэ тогтмол зам
 * түүнээс түрүүлж таарна.
 */

// Үлдэгдэл, үнэ хурдан шинэчлэгдэнэ
export const revalidate = 60;

export const metadata: Metadata = {
  title: `${FRUIT_BRAND.name} — шинэхэн алим`,
  description: "Бельги, Польшийн шинэхэн алим — 1кг савлагаа болон бүтэн хайрцгаар гэрт тань хүргэнэ.",
};

export default async function FruitPage() {
  if (!FRUIT_PREVIEW) notFound();
  const [products, settings, banners] = await Promise.all([
    getFruitCatalog(),
    getPublicCommerceSettings(),
    getFruitBanners(),
  ]);
  const minOrder = settings.fruit_min_order_amount;

  return (
    <div className="my-6">
      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-xs text-ink-500">
        <Link href="/">Нүүр</Link><span>/</span><span>{FRUIT_BRAND.name}</span>
      </nav>

      <header className="relative overflow-hidden rounded-2xl bg-brand-600 text-white">
        <FruitBannerSlides urls={banners} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#b81e22] via-[#b81e22]/80 via-45% to-transparent to-80%" />
        <div className="relative max-w-[640px] p-6 md:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide text-ink-900">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-900" /> Шинэхэн
          </span>
          <h1 className="font-display mt-3 text-3xl font-black leading-tight md:text-[42px]">
            Шинэхэн жимс — гэрт тань
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/90">
            Европын шинэхэн жимсийг кг-аар эсвэл бүтэн хайрцгаар нь захиалаад гэртээ хүргүүлээрэй.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-white px-4 py-3 text-sm text-ink-700">
        <span>
          <span aria-hidden>🚚 </span>
          <b className="text-ink-900">{formatMnt(minOrder)}</b>-өөс дээш жимсний захиалгад хүргэлттэй
        </span>
        <span>
          Хүргэлтийн төлбөр <b className="text-ink-900">{formatMnt(FRUIT_DELIVERY_FEE)}</b>
        </span>
      </div>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold">Алим</h2>
          <span className="text-sm text-ink-500">{products.length} төрөл</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <FruitCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 rounded-[16px] border border-ink-200 bg-white p-6 sm:grid-cols-3">
        {[
          ["Шинэхэн", "Бельги, Польшийн алим"],
          ["Савлагаа", "1 кг-аас 12 кг хайрцаг хүртэл"],
          ["Гэрт хүргэнэ", `${formatMnt(minOrder)}-өөс дээш захиалгад`],
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
