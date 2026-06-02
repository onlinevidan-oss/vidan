"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createCategory(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error(guard.error);

  const name_mn = (formData.get("name_mn") as string)?.trim();
  const name_en = (formData.get("name_en") as string)?.trim() || null;
  const emoji = (formData.get("emoji") as string)?.trim() || null;
  const color_gradient = (formData.get("color_gradient") as string)?.trim() || null;
  const slugRaw = (formData.get("slug") as string)?.trim();
  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name_mn);
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;
  const is_active = formData.get("is_active") === "on";
  const is_featured = formData.get("is_featured") === "on";

  if (!name_mn || !slug) throw new Error("Нэр заавал оруулна уу");

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({
    name_mn,
    name_en,
    emoji,
    color_gradient,
    slug,
    sort_order,
    is_active,
    is_featured,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategory(id: string, formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error(guard.error);

  const name_mn = (formData.get("name_mn") as string)?.trim();
  const name_en = (formData.get("name_en") as string)?.trim() || null;
  const emoji = (formData.get("emoji") as string)?.trim() || null;
  const color_gradient = (formData.get("color_gradient") as string)?.trim() || null;
  const slugRaw = (formData.get("slug") as string)?.trim();
  const slug = slugRaw ? toSlug(slugRaw) : toSlug(name_mn);
  const sort_order = parseInt(formData.get("sort_order") as string) || 0;
  const is_active = formData.get("is_active") === "on";
  const is_featured = formData.get("is_featured") === "on";

  if (!name_mn || !slug) throw new Error("Нэр заавал оруулна уу");

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name_mn, name_en, emoji, color_gradient, slug, sort_order, is_active, is_featured })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error(guard.error);

  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    throw new Error(`Энэ ангилалд ${count} бүтээгдэхүүн байна. Эхлээд бүтээгдэхүүнийг шилжүүлнэ үү.`);
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/categories");
}
