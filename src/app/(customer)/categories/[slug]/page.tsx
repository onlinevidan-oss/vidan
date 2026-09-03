import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/customer/ProductCard";
import { getCategories, getCategoryBySlug, getProducts } from "@/lib/queries/products";
import { ViewItemListEvent } from "@/components/analytics/EcommerceEvents";

export const revalidate = 300;
type SlugPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Ангилал олдсонгүй", robots: { index: false, follow: false } };
  const description = `${category.name_mn} ангиллын VIDAN бүтээгдэхүүнүүдийн үнэ, савлагаа, орц болон нөөцийн мэдээллийг үзэж онлайнаар захиалаарай.`;
  return {
    title: category.name_mn,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: { title: `${category.name_mn} | VIDAN`, description, url: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const products = await getProducts({ categorySlug: slug, sort: "newest" });
  return (
    <div className="my-6">
      <ViewItemListEvent listId={`category_${slug}`} listName={category.name_mn} items={products.map((product) => ({ item_id: product.id, item_name: product.name_mn, item_category: category.name_mn, price: Number(product.price), quantity: 1 }))} />
      <nav aria-label="Breadcrumb" className="mb-3 flex gap-2 text-xs text-ink-500">
        <Link href="/">Нүүр</Link><span>/</span><Link href="/products">Бүтээгдэхүүн</Link><span>/</span><span>{category.name_mn}</span>
      </nav>
      <header className="rounded-2xl bg-white p-6 md:p-9">
        <h1 className="font-display text-3xl font-black text-ink-900">{category.emoji} {category.name_mn}</h1>
        <p className="mt-3 max-w-3xl leading-relaxed text-ink-700">{category.name_mn} ангиллын бүтээгдэхүүнүүдийн үнэ, савлагаа, орц, хадгалалтын мэдээллийг харьцуулж сонгоорой.</p>
      </header>
      <section className="mt-10">
        <h2 className="font-display mb-5 text-2xl font-extrabold">Бүтээгдэхүүнүүд</h2>
        {products.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-xl bg-white p-6 text-ink-500">Энэ ангилалд бүтээгдэхүүн алга.</p>}
      </section>
      <section className="mt-10 rounded-2xl border border-ink-200 bg-white p-6">
        <h2 className="font-display text-xl font-extrabold">Сонгоход анхаарах зүйл</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">Бүтээгдэхүүний цэвэр жин, орц, хадгалах хугацаа болон нөөцийг дэлгэрэнгүй хуудаснаас шалгана уу. Улаанбаатар хотын хүргэлтийн нөхцөлийг <Link className="font-bold text-brand-600" href="/delivery">эндээс</Link> үзнэ үү.</p>
      </section>
    </div>
  );
}
