/**
 * Admin server actions-д хэрэглэх authorization guard.
 * RLS-ээр backstop боловч defense-in-depth-ийн үүднээс
 * server action бүрд нэмэлт шалгалт хийнэ.
 */
import { getCurrentStaff, isAdminRole } from "@/lib/queries/staff";
import type { Database } from "@/lib/supabase/database.types";

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

export type GuardResult =
  | { ok: true; staff: StaffRow }
  | { ok: false; error: string };

/** Staff гишүүн байх ёстой */
export async function requireStaff(): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Хандах эрх алга — staff биш" };
  return { ok: true, staff };
}

/** Admin/Manager эрхтэй staff байх ёстой */
export async function requireAdmin(): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  if (!staff || !isAdminRole(staff.role)) {
    return { ok: false, error: "Зөвхөн админ үйлдэх боломжтой" };
  }
  return { ok: true, staff };
}
