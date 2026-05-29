import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { createClient } from "@/lib/supabase/server";
import { formatMnt } from "@/lib/utils";
import { getProductMeta } from "@/lib/product-meta";

export const metadata = { title: "Бүтээгдэхүүн | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminProducts({
  searchParams,
}: PageProps<"/admin/products">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const categorySlug = typeof params.category === "string" ? params.category : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const supabase = await createClient();

  // Categories for filter
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_mn, slug")
    .eq("is_active", true)
    .order("sort_order");

  // Products query
  let q = supabase
    .from("products")
    .select(
      "id, sku, name_mn, slug, price, old_price, stock, stock_threshold, is_active, is_featured, is_new, is_bio, category:categories(id, name_mn, slug), images:product_images(url)",
    )
    .order("created_at", { ascending: false });

  if (status === "inactive") q = q.eq("is_active", false);
  if (status === "active") q = q.eq("is_active", true);
  if (status === "low") q = q.lte("stock", 20).eq("is_active", true);
  if (status === "out") q = q.eq("stock", 0);
  if (categorySlug) {
    const cat = categories?.find((c) => c.slug === categorySlug);
    if (cat) q = q.eq("category_id", cat.id);
  }
  if (search && search.trim()) q = q.ilike("name_mn", `%${search.trim()}%`);

  const { data: products } = await q;

  // Totals for chips
  const { count: totalCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });
  const { count: lowCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .lte("stock", 20)
    .eq("is_active", true);
  const { count: outCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("stock", 0);

  return (
    <>
      <TopBar title="Бүтээгдэхүүн" crumb={status ?? "Бүгд"} />
      <div className="flex-1 p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Бүтээгдэхүүний удирдлага
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Нийт <strong className="text-ink-900">{totalCount ?? 0}</strong> бүтээгдэхүүн ·{" "}
              <strong className="text-[#e89823]">{lowCount ?? 0}</strong> нь дуусч буй
            </div>
          </div>
          <Link
            href="/admin/products/new"
            className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            ＋ Шинэ бүтээгдэхүүн
          </Link>
        </div>

        {/* Filters */}
        <form
          method="get"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white p-3"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1 max-w-md">
            <input
              name="search"
              type="text"
              defaultValue={search ?? ""}
              placeholder="Нэр, SKU хайх..."
              className="w-full rounded-lg border-[1.5px] border-ink-200 bg-cream px-3 py-2 pl-9 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-50">
              🔍
            </span>
          </div>
          <select
            name="category"
            defaultValue={categorySlug ?? ""}
            className="rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[13px] font-semibold"
          >
            <option value="">Бүх ангилал</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name_mn}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-bold text-white"
          >
            Хэрэгжүүлэх
          </button>
          <div className="flex flex-wrap gap-2">
            <Chip href="/admin/products" active={!status} label={`Бүгд (${totalCount ?? 0})`} />
            <Chip href="/admin/products?status=active" active={status === "active"} label="Идэвхтэй" />
            <Chip href="/admin/products?status=low" active={status === "low"} label={`Дуусч буй (${lowCount ?? 0})`} />
            <Chip href="/admin/products?status=out" active={status === "out"} label={`Дууссан (${outCount ?? 0})`} />
          </div>
        </form>

        <div className="rounded-2xl border border-ink-200 bg-white">
          {!products || products.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">🛒</div>
              <div className="font-display text-base font-bold text-ink-700">
                Бүтээгдэхүүн алга
              </div>
              <Link
                href="/admin/products/new"
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white"
              >
                Эхний бүтээгдэхүүн нэмэх
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    <Th>Бүтээгдэхүүн</Th>
                    <Th>SKU</Th>
                    <Th>Ангилал</Th>
                    <Th>Үнэ</Th>
                    <Th>Нөөц</Th>
                    <Th>Tag</Th>
                    <Th>Төлөв</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const meta = getProductMeta(p.sku);
                    const cat = p.category as { name_mn: string; slug: string } | null;
                    const firstImg = (p.images as { url: string }[])?.[0]?.url;
                    const stockBadge =
                      p.stock === 0
                        ? { class: "bg-brand-100 text-brand-700", label: "Дууссан" }
                        : p.stock <= (p.stock_threshold ?? 20)
                          ? { class: "bg-[#fdf2dc] text-[#e89823]", label: "Дуусч буй" }
                          : { class: "bg-[#e3f5ea] text-[#2da764]", label: "Бэлэн" };
                    return (
                      <tr key={p.id} className="border-t border-ink-100 hover:bg-cream">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg text-xl ${meta.bg}`}
                            >
                              {firstImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={firstImg} alt={p.name_mn} className="h-full w-full object-cover" />
                              ) : (
                                meta.emoji
                              )}
                            </div>
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="font-semibold text-ink-900 hover:text-brand-700"
                            >
                              {p.name_mn}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-display font-bold text-ink-500">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 text-ink-700">{cat?.name_mn ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-display font-bold">{formatMnt(p.price)}</div>
                          {p.old_price && p.old_price > p.price && (
                            <div className="text-xs text-ink-500 line-through">
                              {formatMnt(p.old_price)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stockBadge.class}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {p.stock} ш · {stockBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.is_featured && <Tag>⭐</Tag>}
                            {p.is_new && <Tag color="lime">ШИНЭ</Tag>}
                            {p.is_bio && <Tag color="dark">BIO</Tag>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.is_active ? (
                            <span className="rounded-full bg-[#e3f5ea] px-2.5 py-0.5 text-[11px] font-bold text-[#2da764]">
                              ● Идэвхтэй
                            </span>
                          ) : (
                            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-bold text-ink-500">
                              ○ Идэвхгүй
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="rounded-md px-2 py-1 text-ink-500 hover:bg-ink-100 hover:text-brand-700"
                          >
                            ✎
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
      {children}
    </th>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-600 px-3 py-1.5 text-xs font-bold text-white"
          : "rounded-full border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:border-brand-500 hover:text-brand-700"
      }
    >
      {label}
    </Link>
  );
}

function Tag({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "lime" | "dark" }) {
  const cls = color === "lime" ? "bg-lime-100 text-lime-700" : color === "dark" ? "bg-ink-900 text-lime-500" : "bg-cream text-ink-700";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {children}
    </span>
  );
}
