import Link from "next/link";
import { ProductCard } from "@/components/customer/ProductCard";
import {
  getCategoriesWithProductCount,
  getProducts,
  type ProductSort,
} from "@/lib/queries/products";

export const metadata = { title: "Бүтээгдэхүүн | VIDAN" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const isNew = params.new === "true";
  const saleOnly = params.sale === "true";
  const search = typeof params.search === "string" ? params.search : undefined;
  const sort = (typeof params.sort === "string" ? params.sort : "newest") as ProductSort;

  const [products, categories] = await Promise.all([
    getProducts({ categorySlug, isNew, saleOnly, search, sort }),
    getCategoriesWithProductCount(),
  ]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);
  const pageTitle = isNew
    ? "Шинээр гарсан"
    : saleOnly
      ? "Хямдрал"
      : search
        ? `"${search}" хайлт`
        : activeCategory
          ? activeCategory.name_mn
          : "Бүх бүтээгдэхүүн";

  return (
    <div className="my-6">
      {/* Breadcrumb + title */}
      <div className="mb-6">
        <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
          <Link href="/" className="hover:text-brand-700">Нүүр</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-700">Бүтээгдэхүүн</Link>
          {(activeCategory || isNew || saleOnly || search) && (
            <>
              <span>/</span>
              <span className="text-ink-700">{pageTitle}</span>
            </>
          )}
        </nav>
        <h1 className="font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
          {pageTitle}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Нийт <strong className="text-ink-900">{products.length}</strong> бүтээгдэхүүн олдлоо
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar filters */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Ангилал
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/products"
                  className={
                    !categorySlug && !isNew && !saleOnly
                      ? "flex items-center justify-between rounded-lg bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700"
                      : "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-cream"
                  }
                >
                  <span>Бүгд</span>
                  <span className="text-xs text-ink-500">
                    {categories.reduce((s, c) => s + c.product_count, 0)}
                  </span>
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${c.slug}`}
                    className={
                      categorySlug === c.slug
                        ? "flex items-center justify-between rounded-lg bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700"
                        : "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-cream"
                    }
                  >
                    <span>
                      {c.emoji} {c.name_mn}
                    </span>
                    <span className="text-xs text-ink-500">{c.product_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Шүүлтүүр
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/products?new=true"
                  className={
                    isNew
                      ? "block rounded-lg bg-lime-100 px-3 py-2 text-sm font-bold text-lime-700"
                      : "block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-cream"
                  }
                >
                  ⭐ Шинээр гарсан
                </Link>
              </li>
              <li>
                <Link
                  href="/products?sale=true"
                  className={
                    saleOnly
                      ? "block rounded-lg bg-brand-100 px-3 py-2 text-sm font-bold text-brand-700"
                      : "block rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-cream"
                  }
                >
                  🔥 Хямдрал
                </Link>
              </li>
            </ul>
          </div>
        </aside>

        {/* Products grid */}
        <section>
          {/* Sort bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
            <form className="flex-1 max-w-[400px]" method="get">
              <div className="relative">
                <input
                  name="search"
                  type="text"
                  defaultValue={search ?? ""}
                  placeholder="Бүтээгдэхүүний нэрээр хайх..."
                  className="w-full rounded-lg border-[1.5px] border-ink-200 bg-cream px-3 py-2 pl-9 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-50">
                  🔍
                </span>
              </div>
            </form>

            <SortForm
              currentSort={sort}
              currentCategory={categorySlug}
              currentNew={isNew}
              currentSale={saleOnly}
              currentSearch={search}
            />
          </div>

          {products.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border-[1.5px] border-dashed border-ink-200 bg-white p-16 text-center">
              <div className="mb-3 text-5xl opacity-40">🫙</div>
              <div className="font-display text-lg font-bold text-ink-700">
                Бүтээгдэхүүн олдсонгүй
              </div>
              <p className="mt-1 text-sm text-ink-500">
                Шүүлтүүр эсвэл хайлтын нөхцөлийг өөрчилж үзнэ үү
              </p>
              <Link
                href="/products"
                className="mt-5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                Бүх бүтээгдэхүүнийг үзэх
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SortForm({
  currentSort,
  currentCategory,
  currentNew,
  currentSale,
  currentSearch,
}: {
  currentSort: ProductSort;
  currentCategory?: string;
  currentNew: boolean;
  currentSale: boolean;
  currentSearch?: string;
}) {
  return (
    <form method="get" className="flex items-center gap-2">
      {/* Persist other filters as hidden inputs */}
      {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
      {currentNew && <input type="hidden" name="new" value="true" />}
      {currentSale && <input type="hidden" name="sale" value="true" />}
      {currentSearch && <input type="hidden" name="search" value={currentSearch} />}
      <label className="text-xs font-bold uppercase tracking-wider text-ink-500">
        Эрэмбэ:
      </label>
      <select
        name="sort"
        defaultValue={currentSort}
        className="rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[13px] font-semibold outline-none transition focus:border-brand-500"
      >
        <option value="newest">Шинээр</option>
        <option value="price-asc">Үнэ: бага → их</option>
        <option value="price-desc">Үнэ: их → бага</option>
        <option value="name">Нэрээр</option>
      </select>
      <button
        type="submit"
        className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-ink-800"
      >
        Хэрэгжүүлэх
      </button>
    </form>
  );
}
