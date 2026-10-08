import { TopBar } from "@/components/admin/TopBar";
import { ProductForm } from "@/components/admin/ProductForm";
import { createClient } from "@/lib/supabase/server";
import { nextSku } from "@/lib/sku";

export const metadata = { title: "Шинэ бүтээгдэхүүн | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }, { data: skus }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name_mn")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("brands").select("id, name").order("sort_order"),
      supabase.from("products").select("sku"),
    ]);

  return (
    <>
      <TopBar title="Бүтээгдэхүүн" crumb="Шинэ" />
      <div className="flex-1 p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Шинэ бүтээгдэхүүн
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Дэлгүүрт шинэ бүтээгдэхүүн нэмэх
          </p>
        </div>
        <ProductForm
          mode="create"
          categories={categories ?? []}
          brands={brands ?? []}
          suggestedSku={nextSku((skus ?? []).map((p) => p.sku))}
        />
      </div>
    </>
  );
}
