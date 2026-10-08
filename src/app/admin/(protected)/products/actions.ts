"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-guard";
import { slugify } from "@/lib/utils";
import { isValidSku, normalizeSku, SKU_HINT } from "@/lib/sku";
import { isValidClassificationCode } from "@/lib/ebarimt/classification";
import type { Database } from "@/lib/supabase/database.types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type ProductFormPayload = {
  sku: string;
  name_mn: string;
  name_en?: string;
  slug: string;
  category_id: string;
  brand_id: string;
  /** И-баримтын GS1 ангиллын код (7 орон) */
  classification_code: string;
  short_description?: string;
  description?: string;
  price: number;
  old_price?: number | null;
  cost_price?: number | null;
  /**
   * Зөвхөн ҮҮСГЭХ үед: эхний үлдэгдэл — орлогын хөдөлгөөн болж бичигдэнэ.
   * Засах үед үл тооно: үлдэгдэл зөвхөн агуулахын хөдөлгөөнөөр өөрчлөгдөнө.
   */
  initial_stock?: number;
  stock_threshold?: number;
  weight_net_g?: number | null;
  weight_gross_g?: number | null;
  shelf_life?: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bio: boolean;
  heart_program: boolean;
  tags: string[];
  meta_description?: string;
};

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/products/";

/** Цэвэр Supabase public URL мөн эсэхийг шалгах (arbitrary URL injection-аас сэргийлэх) */
function isOwnSupabaseImageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  return url.startsWith(`${base}${STORAGE_PUBLIC_PREFIX}`);
}

function normalizeSlug(input: string, fallback: string): string {
  let s = slugify(input);
  if (!s) s = slugify(fallback);
  return s || `product-${Date.now()}`;
}

/** Бараа болон админы дотоод бүх path-ийг revalidate */
function revalidateProductPaths(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/products/${slug}`);
  }
}

/** Серверийн шалгалт — клиентийн шалгалтыг тойрсон хүсэлтээс хамгаална */
function validatePayload(payload: ProductFormPayload): string | null {
  if (!payload.name_mn?.trim()) return "Нэр оруулна уу";
  if (!isValidSku(payload.sku ?? "")) return `SKU буруу — ${SKU_HINT}`;
  if (!payload.category_id) return "Ангилал сонгоно уу";
  if (!payload.brand_id) return "Брэнд сонгоно уу";
  if (!isValidClassificationCode(payload.classification_code ?? "")) {
    return "И-баримтын ангиллын код 7 оронтой тоо байх ёстой";
  }
  if (!(Number(payload.price) > 0)) return "Үнэ 0-ээс их байх ёстой";
  return null;
}

/** Давхардсан SKU / slug-ийн DB алдааг хүнд ойлгомжтой болгоно */
function humanDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("sku")) return "Энэ SKU аль хэдийн бүртгэлтэй байна";
    if (error.message.includes("slug")) return "Энэ URL slug аль хэдийн бүртгэлтэй байна";
  }
  return error.message;
}

/**
 * `stock` энд БАЙХГҮЙ: үлдэгдлийг барааны формоор шууд бичвэл хөдөлгөөний
 * түүхээс салж, мөн засах хуудас нээлттэй байх хооронд орсон захиалгын
 * хасалтыг хуучин тоогоор дарж бичнэ.
 */
function payloadToRow(payload: ProductFormPayload) {
  return {
    sku: normalizeSku(payload.sku),
    name_mn: payload.name_mn.trim(),
    name_en: payload.name_en?.trim() || null,
    slug: normalizeSlug(payload.slug, payload.name_mn),
    category_id: payload.category_id,
    brand_id: payload.brand_id,
    classification_code: payload.classification_code.trim(),
    short_description: payload.short_description?.trim() || null,
    description: payload.description?.trim() || null,
    price: payload.price,
    old_price: payload.old_price ?? null,
    cost_price: payload.cost_price ?? null,
    stock_threshold: payload.stock_threshold ?? 20,
    weight_net_g: payload.weight_net_g ?? null,
    weight_gross_g: payload.weight_gross_g ?? null,
    shelf_life: payload.shelf_life?.trim() || null,
    is_active: payload.is_active,
    is_featured: payload.is_featured,
    is_new: payload.is_new,
    is_bio: payload.is_bio,
    heart_program: payload.heart_program,
    tags: payload.tags,
    meta_description: payload.meta_description?.trim() || null,
  };
}

export async function createProduct(
  payload: ProductFormPayload,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const invalid = validatePayload(payload);
  if (invalid) return { ok: false, error: invalid };

  const initialStock = Math.trunc(Number(payload.initial_stock ?? 0));
  if (!Number.isFinite(initialStock) || initialStock < 0) {
    return { ok: false, error: "Эхний үлдэгдэл 0 ба түүнээс их бүхэл тоо байх ёстой" };
  }

  const supabase = await createClient();
  const insert: ProductInsert = { ...payloadToRow(payload), stock: 0 };
  const { data, error } = await supabase
    .from("products")
    .insert(insert)
    .select("id, slug")
    .single();
  if (error || !data) {
    return { ok: false, error: error ? humanDbError(error) : "Failed" };
  }

  // Эхний үлдэгдлийг ОРЛОГО гэж бүртгэнэ — products.stock ба хөдөлгөөний
  // түүх эхнээсээ тэнцүү байна. Бүртгэж чадахгүй бол барааг буцааж
  // устгана: үлдэгдэлгүй хагас бараа үлдээхээс алдааг харуулсан нь дээр.
  if (initialStock > 0) {
    const { error: mvErr } = await supabase.rpc("record_stock_movement", {
      p_product_id: data.id,
      p_kind: "in",
      p_qty: initialStock,
      p_note: "Эхний үлдэгдэл",
    });
    if (mvErr) {
      await supabase.from("products").delete().eq("id", data.id);
      return {
        ok: false,
        error: `Эхний үлдэгдэл бүртгэж чадсангүй: ${mvErr.message}`,
      };
    }
  }

  revalidateProductPaths(data.slug);
  revalidatePath("/admin/inventory");
  return { ok: true, id: data.id };
}

export async function updateProduct(
  id: string,
  payload: ProductFormPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const invalid = validatePayload(payload);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const update: ProductUpdate = payloadToRow(payload);
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select("slug")
    .single();
  if (error) return { ok: false, error: humanDbError(error) };

  revalidateProductPaths(data?.slug);
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();

  // Эхлээд бүх зургийн storage path-уудыг олж устгана
  const { data: imgs } = await supabase
    .from("product_images")
    .select("url")
    .eq("product_id", id);
  if (imgs && imgs.length > 0) {
    const paths = imgs
      .map((i) => extractStoragePath(i.url))
      .filter((p): p is string => !!p);
    if (paths.length > 0) {
      await supabase.storage.from("products").remove(paths);
    }
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateProductPaths();
  return { ok: true };
}

export async function deleteProductAndRedirect(id: string): Promise<never> {
  await deleteProduct(id);
  redirect("/admin/products");
}

/**
 * Зураг бүртгэх — URL нь зөвхөн өөрсдийн Supabase storage-ээс ирэх ёстой.
 * Arbitrary URL injection (phishing image attach) хаах.
 */
export async function addProductImage(
  productId: string,
  url: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (!isOwnSupabaseImageUrl(url)) {
    return { ok: false, error: "Зургийн URL зөвшөөрөгдөхгүй" };
  }

  const supabase = await createClient();

  // Sort order race-аас сэргийлж max+1 ашиглах
  const { data: maxRow } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message || "Insert failed" };

  revalidatePath(`/admin/products/${productId}`);
  revalidateProductPaths();
  return { ok: true, id: data.id };
}

/** Зураг устгах — DB row + Storage object хоёуланг устгана (orphan files хаах) */
export async function removeProductImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();

  const { data: img } = await supabase
    .from("product_images")
    .select("url, product_id")
    .eq("id", imageId)
    .maybeSingle();

  if (img) {
    const path = extractStoragePath(img.url);
    if (path) {
      await supabase.storage.from("products").remove([path]);
    }
    await supabase.from("product_images").delete().eq("id", imageId);
    revalidatePath(`/admin/products/${img.product_id}`);
  }

  revalidateProductPaths();
  return { ok: true };
}

/** Public URL-ээс storage relative path-ийг гаргаж авна */
function extractStoragePath(url: string): string | null {
  const idx = url.indexOf(STORAGE_PUBLIC_PREFIX);
  if (idx < 0) return null;
  return url.slice(idx + STORAGE_PUBLIC_PREFIX.length);
}
