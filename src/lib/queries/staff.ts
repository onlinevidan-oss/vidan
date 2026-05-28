/**
 * Staff (backoffice ажилтан) -ийн query-үүд
 */
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StaffRole = Database["public"]["Tables"]["staff"]["Row"]["role"];
export type StaffRow  = Database["public"]["Tables"]["staff"]["Row"];

/**
 * Одоогийн нэвтэрсэн хэрэглэгчийн staff мэдээллийг буцаана.
 * - null: нэвтрээгүй ЭСВЭЛ staff биш
 * - StaffRow: идэвхтэй staff
 */
export async function getCurrentStaff(): Promise<StaffRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

/** Эрх шалгах helper */
export function isAdminRole(role: StaffRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}
