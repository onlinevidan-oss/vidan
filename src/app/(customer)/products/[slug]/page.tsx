import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/customer/ProductCard";
import { AddToCartBlock } from "@/components/customer/AddToCartBlock";
import { ProductGallery } from "@/components/customer/ProductGallery";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/products";
import { getProductMeta, getProductTag } from "@/lib/product-meta";
import { formatMnt } from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Олдсонгүй | VIDAN" };
  return {
    title: `${product.name_mn} | VIDAN`,
    description: product.short_description || product.description || undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = product.category_id
    ? await getRelatedProducts(product.category_id, product.id, 4)
    : [];

  const meta = getProductMeta(product.sku);
  const { tag, tagText } = getProductTag(product);
  const discountPct =
    product.old_price && product.old_price > product.price
      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
      : null;
  const images = [...(product.images ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  return (
    <div className="my-6">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">Нүүр</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-700">Бүтээгдэхүүн</Link>
        {product.category?.slug && (
          <>
            <span>/</span>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-brand-700"
            >
              {product.category.name_mn}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-ink-700">{product.name_mn}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Image side */}
        <div>
          {images.length > 0 ? (
            <ProductGallery
              images={images.map((i) => ({ url: i.url, alt: product.name_mn }))}
              tag={tag}
              tagText={tagText}
            />
          ) : (
            <div
              className={`relative grid aspect-square place-items-center overflow-hidden rounded-[20px] text-[180px] ${meta.bg}`}
            >
              {meta.emoji}
              {tag && (
                <span
                  className={`absolute left-5 top-5 rounded-lg px-3 py-1.5 text-xs font-extrabold tracking-wide ${
                    tag === "discount"
                      ? "bg-brand-600 text-white"
                      : tag === "new"
                        ? "bg-lime-600 text-ink-900"
                        : "bg-ink-900 text-lime-500"
                  }`}
                >
                  {tagText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info side */}
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-600">
            {product.category?.name_mn ?? "—"}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-ink-900">
            {product.name_mn}
          </h1>
          <p className="mt-3 text-sm text-ink-700">
            {product.short_description}
          </p>

          {/* Rating */}
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-[#f5b942]">★★★★★</span>
            <span className="font-bold text-ink-900">4.8</span>
            <span className="text-ink-500">· 150+ үнэлгээ</span>
          </div>

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <div className="font-display text-4xl font-black tracking-tight text-ink-900">
              {formatMnt(product.price)}
            </div>
            {product.old_price && product.old_price > product.price && (
              <>
                <div className="text-lg text-ink-500 line-through">
                  {formatMnt(product.old_price)}
                </div>
                <div className="rounded-md bg-brand-600 px-2 py-1 text-xs font-extrabold text-white">
                  −{discountPct}%
                </div>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            {product.stock > 20 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f5ea] px-3 py-1 text-xs font-bold text-[#2da764]">
                ✓ {product.stock} ширхэг бэлэн
              </span>
            ) : product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf2dc] px-3 py-1 text-xs font-bold text-[#e89823]">
                ⚠️ Зөвхөн {product.stock} ширхэг үлдсэн
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                ✕ Дууссан
              </span>
            )}
          </div>

          {/* Add to cart */}
          <div className="mt-6">
            <AddToCartBlock
              product={{
                id: product.id,
                sku: product.sku,
                name: product.name_mn,
                price: product.price,
                inStock: product.stock > 0,
              }}
            />
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-700"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Specs */}
          <div className="mt-7 rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Дэлгэрэнгүй
            </h3>
            <dl className="space-y-2.5 text-sm">
              <SpecRow label="SKU">{product.sku}</SpecRow>
              {product.weight_net_g && (
                <SpecRow label="Цэвэр жин">{product.weight_net_g}г</SpecRow>
              )}
              {product.shelf_life && (
                <SpecRow label="Хадгалах хугацаа">{product.shelf_life}</SpecRow>
              )}
              {product.is_bio && (
                <SpecRow label="Чанар">
                  <span className="rounded bg-ink-900 px-2 py-0.5 text-xs font-bold text-lime-500">
                    🌱 BIO — байгалийн цэвэр
                  </span>
                </SpecRow>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section className="mt-12 rounded-2xl border border-ink-200 bg-white p-7">
          <h2 className="font-display mb-4 text-xl font-extrabold tracking-tight text-ink-900">
            Бүтээгдэхүүний тухай
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-700">
            {product.description}
          </p>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl md:text-[28px] font-extrabold tracking-tight text-ink-900">
              Холбоотой бүтээгдэхүүн
            </h2>
            <Link
              href={`/products?category=${product.category?.slug}`}
              className="text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Ангилал бүхэлд нь →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpecRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
