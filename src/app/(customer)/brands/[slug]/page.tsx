import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/customer/ProductCard";
import { getBrandBySlug, getBrands, getProducts } from "@/lib/queries/products";
import { ViewItemListEvent } from "@/components/analytics/EcommerceEvents";

export const revalidate = 300;
type SlugPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((brand) => ({ slug: brand.slug }));
}

const BRAND_COPY: Record<string, { intro: string; faq: string }> = {
  vidan: {
    intro: "VIDAN бол эх орны хөрсөнд ургуулсан хүнсний ногоо, жимс жимсгэнийг орчин үеийн технологиор боловсруулдаг үндэсний брэнд юм.",
    faq: "VIDAN бүтээгдэхүүнийг Улаанбаатар хотод онлайнаар захиалан хүргүүлэх боломжтой.",
  },
  mangas: {
    intro: "Мангас брэндийн хоол амтлагч нь өдөр тутмын хоолыг хурдан, амттай бэлтгэхэд зориулсан сонголт юм.",
    faq: "Мангас амтлагчийн савлагаа, үнэ болон нөөцийн мэдээллийг бүтээгдэхүүн тус бүрээс харна уу.",
  },
  alimhan: {
    intro: "Алимхан брэнд нь хүүхэд болон гэр бүлийн өдөр тутмын хэрэглээнд зориулсан жимс, ногооны нухаш санал болгодог.",
    faq: "Орц, цэвэр жин, хадгалах хугацааг бүтээгдэхүүний дэлгэрэнгүй хуудаснаас шалгана уу.",
  },
  owolovo: {
    intro: "Owolovo брэндийн жимс, ногооны нухаш нь олон төрлийн амт, савлагааны сонголттой.",
    faq: "Owolovo бүтээгдэхүүний одоогийн үнэ, нөөц болон хүргэлтийн мэдээлэл сайтад шинэчлэгдэнэ.",
  },
};

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Брэнд олдсонгүй", robots: { index: false, follow: false } };
  const description = BRAND_COPY[slug]?.intro ?? `${brand.name} брэндийн бүтээгдэхүүнүүдийг VIDAN онлайн дэлгүүрээс үзэж, захиалаарай.`;
  return {
    title: `${brand.name} брэндийн бүтээгдэхүүн`,
    description,
    alternates: { canonical: `/brands/${slug}` },
    openGraph: { title: `${brand.name} брэнд | VIDAN`, description, url: `/brands/${slug}`, images: brand.logo_url ? [brand.logo_url] : undefined },
  };
}

export default async function BrandPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();
  const products = await getProducts({ brandId: brand.id, sort: "newest" });
  const copy = BRAND_COPY[slug] ?? {
    intro: `${brand.name} брэндийн бүтээгдэхүүнүүдийг нэг дороос сонгоорой.`,
    faq: "Үнэ, нөөц болон бүтээгдэхүүний мэдээлэл тогтмол шинэчлэгдэнэ.",
  };
  return (
    <div className="my-6">
      <ViewItemListEvent listId={`brand_${slug}`} listName={`${brand.name} брэнд`} items={products.map((product) => ({ item_id: product.id, item_name: product.name_mn, price: Number(product.price), quantity: 1 }))} />
      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-xs text-ink-500">
        <Link href="/">Нүүр</Link><span>/</span><Link href="/products">Бүтээгдэхүүн</Link><span>/</span><span>{brand.name}</span>
      </nav>
      <header className="rounded-2xl bg-white p-6 md:p-9">
        <h1 className="font-display text-3xl font-black text-ink-900">{brand.name} брэнд</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-ink-700">{copy.intro}</p>
      </header>
      <section className="mt-10">
        <h2 className="font-display mb-5 text-2xl font-extrabold">{brand.name} бүтээгдэхүүнүүд</h2>
        {products.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-xl bg-white p-6 text-ink-500">Бүтээгдэхүүн удахгүй нэмэгдэнэ.</p>}
      </section>
      <section className="mt-10 rounded-2xl border border-ink-200 bg-white p-6">
        <h2 className="font-display text-xl font-extrabold">Түгээмэл асуулт</h2>
        <h3 className="mt-4 font-bold">{brand.name} бүтээгдэхүүнийг хаанаас авах вэ?</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">{copy.faq}</p>
      </section>
    </div>
  );
}
