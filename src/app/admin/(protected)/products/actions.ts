"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type ProductFormPayload = {
  sku: string;
  name_mn: string;
  name_en?: string;
  slug: string;
  category_id: string;
  short_description?: string;
  description?: string;
  price: number;
  old_price?: number | null;
  cost_price?: number | null;
  stock: number;
  stock_threshold?: number;
  weight_net_g?: number | null;
  weight_gross_g?: number | null;
  shelf_life?: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bio: boolean;
  tags: string[];
  meta_description?: string;
};

export async function createProduct(
  payload: ProductFormPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const insert: ProductInsert = {
    sku: payload.sku.trim(),
    name_mn: payload.name_mn.trim(),
    name_en: payload.name_en?.trim() || null,
    slug: payload.slug.trim(),
    category_id: payload.category_id,
    short_description: payload.short_description?.trim() || null,
    description: payload.description?.trim() || null,
    price: payload.price,
    old_price: payload.old_price ?? null,
    cost_price: payload.cost_price ?? null,
    stock: payload.stock,
    stock_threshold: payload.stock_threshold ?? 20,
    weight_net_g: payload.weight_net_g ?? null,
    weight_gross_g: payload.weight_gross_g ?? null,
    shelf_life: payload.shelf_life?.trim() || null,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    is_new: payload.is_new,
    is_bio: payload.is_bio,
    tags: payload.tags,
    meta_description: payload.meta_description?.trim() || null,
  };
  const { data, error } = await supabase
    .from("products")
    .insert(insert)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Failed" };

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true, id: data.id };
}

export async function updateProduct(
  id: string,
  payload: ProductFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const update: ProductUpdate = {
    sku: payload.sku.trim(),
    name_mn: payload.name_mn.trim(),
    name_en: payload.name_en?.trim() || null,
    slug: payload.slug.trim(),
    category_id: payload.category_id,
    short_description: payload.short_description?.trim() || null,
    description: payload.description?.trim() || null,
    price: payload.price,
    old_price: payload.old_price ?? null,
    cost_price: payload.cost_price ?? null,
    stock: payload.stock,
    stock_threshold: payload.stock_threshold ?? 20,
    weight_net_g: payload.weight_net_g ?? null,
    weight_gross_g: payload.weight_gross_g ?? null,
    shelf_life: payload.shelf_life?.trim() || null,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    is_new: payload.is_new,
    is_bio: payload.is_bio,
    tags: payload.tags,
    meta_description: payload.meta_description?.trim() || null,
  };
  const { error } = await supabase.from("products").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
  revalidatePath(`/products/${payload.slug}`);
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProductAndRedirect(id: string): Promise<never> {
  await deleteProduct(id);
  redirect("/admin/products");
}

export async function addProductImage(
  productId: string,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  // Дараалал — одоо байгаа зургийн тоо + 1
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    url,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function removeProductImage(imageId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  await supabase.from("product_images").delete().eq("id", imageId);
  revalidatePath("/admin/products");
  return { ok: true };
}
