import { notFound } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { ProductForm } from "@/components/admin/ProductForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Бүтээгдэхүүн засах | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name_mn").eq("is_active", true).order("sort_order"),
    supabase.from("product_images").select("id, url").eq("product_id", id).order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <>
      <TopBar title="Бүтээгдэхүүн" crumb={product.name_mn} />
      <div className="flex-1 p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            {product.name_mn}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            SKU: <strong className="font-display text-ink-900">{product.sku}</strong> ·
            Шинэчилсэн: {new Date(product.updated_at).toLocaleString("mn-MN", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <ProductForm
          mode="edit"
          initialId={product.id}
          initialValues={{
            sku: product.sku,
            name_mn: product.name_mn,
            name_en: product.name_en ?? "",
            slug: product.slug,
            category_id: product.category_id ?? "",
            short_description: product.short_description ?? "",
            description: product.description ?? "",
            price: Number(product.price),
            old_price: product.old_price ? Number(product.old_price) : null,
            cost_price: product.cost_price ? Number(product.cost_price) : null,
            stock: product.stock,
            stock_threshold: product.stock_threshold ?? 20,
            weight_net_g: product.weight_net_g,
            weight_gross_g: product.weight_gross_g,
            shelf_life: product.shelf_life ?? "",
            is_active: product.is_active,
            is_featured: product.is_featured,
            is_new: product.is_new,
            is_bio: product.is_bio,
            tags: product.tags ?? [],
            meta_description: product.meta_description ?? "",
          }}
          categories={categories ?? []}
          initialImages={images ?? []}
        />
      </div>
    </>
  );
}
