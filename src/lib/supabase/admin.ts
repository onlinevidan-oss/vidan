/**
 * Supabase SERVICE ROLE client
 * - RLS-ийг bypass хийнэ. ЗӨВХӨН серверт (route handler, server action) ашиглана.
 * - QPay callback (нэвтрээгүй) болон token cache бичихэд хэрэгтэй.
 * - Энэ key хэзээ ч client bundle-д орох ёсгүй.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY эсвэл NEXT_PUBLIC_SUPABASE_URL тохируулагдаагүй байна",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
