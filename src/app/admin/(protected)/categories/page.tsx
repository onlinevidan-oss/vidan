import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { createClient } from "@/lib/supabase/server";
import { deleteCategory } from "./actions";

export const metadata = { title: "Ангилал | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminCategories() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name_mn, name_en, slug, emoji, color_gradient, is_active, is_featured, sort_order")
    .order("sort_order")
    .order("created_at");

  const { data: productCounts } = await supabase
    .from("products")
    .select("category_id");
  const countMap: Record<string, number> = {};
  (productCounts ?? []).forEach((p) => {
    if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
  });

  return (
    <>
      <TopBar title="Ангилал" crumb="Бүгд" />
      <div className="flex-1 p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
              Ангиллын удирдлага
            </h1>
            <div className="mt-0.5 text-[13px] text-ink-500">
              Нийт <strong className="text-ink-900">{categories?.length ?? 0}</strong> ангилал
            </div>
          </div>
          <Link
            href="/admin/categories/new"
            className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            ＋ Шинэ ангилал
          </Link>
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white">
          {!categories || categories.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">🏷️</div>
              <div className="font-display text-base font-bold text-ink-700">
                Ангилал алга
              </div>
              <Link
                href="/admin/categories/new"
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white"
              >
                Эхний ангилал нэмэх
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#faf8f3]">
                    <Th>Ангилал</Th>
                    <Th>Slug</Th>
                    <Th>Бүтээгдэхүүн</Th>
                    <Th>Дараалал</Th>
                    <Th>Онцлох</Th>
                    <Th>Төлөв</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const productCount = countMap[cat.id] ?? 0;
                    return (
                      <tr key={cat.id} className="border-t border-ink-100 hover:bg-cream">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl"
                              style={
                                cat.color_gradient
                                  ? { background: cat.color_gradient }
                                  : { background: "#f3efe7" }
                              }
                            >
                              {cat.emoji ?? "🏷️"}
                            </div>
                            <div>
                              <div className="font-semibold text-ink-900">{cat.name_mn}</div>
                              {cat.name_en && (
                                <div className="text-xs text-ink-500">{cat.name_en}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-500">
                          {cat.slug}
                        </td>
                        <td className="px-4 py-3 text-ink-700">
                          {productCount > 0 ? (
                            <Link
                              href={`/admin/products?category=${cat.slug}`}
                              className="font-bold text-brand-700 hover:underline"
                            >
                              {productCount} ш
                            </Link>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-700">{cat.sort_order}</td>
                        <td className="px-4 py-3">
                          {cat.is_featured ? (
                            <span className="rounded-full bg-[#fdf2dc] px-2.5 py-0.5 text-[11px] font-bold text-[#e89823]">
                              ⭐ Тийм
                            </span>
                          ) : (
                            <span className="text-xs text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {cat.is_active ? (
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
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/admin/categories/${cat.id}`}
                              className="rounded-md px-2 py-1 text-ink-500 hover:bg-ink-100 hover:text-brand-700"
                              title="Засах"
                            >
                              ✎
                            </Link>
                            <DeleteButton id={cat.id} name={cat.name_mn} hasProducts={productCount > 0} />
                          </div>
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

function DeleteButton({
  id,
  name,
  hasProducts,
}: {
  id: string;
  name: string;
  hasProducts: boolean;
}) {
  async function handleDelete() {
    "use server";
    await deleteCategory(id);
  }

  if (hasProducts) {
    return (
      <button
        disabled
        title={`"${name}" ангилалд бүтээгдэхүүн байна`}
        className="cursor-not-allowed rounded-md px-2 py-1 text-ink-300"
      >
        🗑
      </button>
    );
  }

  return (
    <form action={handleDelete}>
      <button
        type="submit"
        title="Устгах"
        className="rounded-md px-2 py-1 text-ink-400 hover:bg-brand-50 hover:text-brand-700"
      >
        🗑
      </button>
    </form>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-500">
      {children}
    </th>
  );
}
