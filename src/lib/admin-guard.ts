/**
 * Admin server actions-д хэрэглэх authorization guard.
 * RLS-ээр backstop боловч defense-in-depth-ийн үүднээс
 * server action бүрд нэмэлт шалгалт хийнэ.
 */
import { getCurrentStaff, isAdminRole } from "@/lib/queries/staff";
import { isFruitRole } from "@/lib/staff-rules";
import type { Database } from "@/lib/supabase/database.types";

type StaffRow = Database["public"]["Tables"]["staff"]["Row"];

export type GuardResult =
  | { ok: true; staff: StaffRow }
  | { ok: false; error: string };

/**
 * VIDAN-ы ажилтан байх ёстой. Жимсний компанийн ажилтан (fruit) энд
 * орохгүй — VIDAN-ы захиалга, хэрэглэгчид хүрэхгүй (0048).
 */
export async function requireStaff(): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  // Жимсний компанийн ажилтан VIDAN-ы өгөгдөлд хүрэхгүй (0048)
  if (!staff || isFruitRole(staff.role)) {
    return { ok: false, error: "Хандах эрх алга — staff биш" };
  }
  return { ok: true, staff };
}

/**
 * Жимсний хэсэг — жимсний ажилтан, эсвэл VIDAN-ы админ/менежер (хянах,
 * тохируулахын тулд). Бусад нь (VIDAN-ы ажилтан, жолооч) орохгүй.
 */
export async function requireFruitAccess(): Promise<
  { ok: true; staff: StaffRow; isFruit: boolean } | { ok: false; error: string }
> {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false, error: "Хандах эрх алга" };
  if (isFruitRole(staff.role)) return { ok: true, staff, isFruit: true };
  if (isAdminRole(staff.role)) return { ok: true, staff, isFruit: false };
  return { ok: false, error: "Хандах эрх алга" };
}

/** Admin/Manager эрхтэй staff байх ёстой */
export async function requireAdmin(): Promise<GuardResult> {
  const staff = await getCurrentStaff();
  if (!staff || !isAdminRole(staff.role)) {
    return { ok: false, error: "Зөвхөн админ үйлдэх боломжтой" };
  }
  return { ok: true, staff };
}
