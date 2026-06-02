import { notFound } from "next/navigation";
import { TopBar } from "@/components/admin/TopBar";
import { createClient } from "@/lib/supabase/server";
import { updateCategory } from "../actions";
import { CategoryForm } from "../CategoryForm";

export const metadata = { title: "Ангилал засах | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!category) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateCategory(id, formData);
  }

  return (
    <>
      <TopBar title="Ангилал" crumb="Засах" />
      <div className="flex-1 p-7">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Ангилал засах
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">{category.name_mn}</div>
        </div>
        <div className="max-w-2xl rounded-2xl border border-ink-200 bg-white p-6">
          <CategoryForm
            category={category}
            action={handleUpdate}
            submitLabel="Хадгалах"
          />
        </div>
      </div>
    </>
  );
}
