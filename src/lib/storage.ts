/**
 * Supabase Storage helpers (products bucket)
 */
import { createClient as createBrowserClient } from "@/lib/supabase/client";

const BUCKET = "products";

/** Public URL-ийг storage path-аас гаргана */
export function getPublicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Браузерээс зураг upload (staff бичих эрхтэй RLS-тэй) */
export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<{ ok: true; path: string; url: string } | { ok: false; error: string }> {
  const supabase = createBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${productId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path: fileName, url: getPublicImageUrl(fileName) };
}

export async function deleteProductImage(path: string): Promise<boolean> {
  const supabase = createBrowserClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}
