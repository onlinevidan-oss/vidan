"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/queries/staff";
import { parseRecipients } from "@/lib/sms/recipients";
import {
  checkStaffChange,
  isStaffRole,
  phoneVariants,
  STAFF_ROLE_LABEL,
  type StaffRole,
} from "@/lib/staff-rules";
import { logStaffActivity } from "@/lib/staff-activity";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Ажилтны эрхийг зөвхөн role = admin удирдана.
 * (RLS нь менежерт ч бичихийг зөвшөөрдөг тул энэ шалгалт нь түүнээс чанга —
 * менежер өөрийгөө админ болгохоос сэргийлнэ.)
 */
async function requireOwner() {
  const me = await getCurrentStaff();
  if (!me || me.role !== "admin") {
    return { ok: false as const, error: "Ажилтны эрхийг зөвхөн админ удирдана" };
  }
  return { ok: true as const, me };
}

/**
 * Утасны дугаараар ажилтан нэмэх.
 * Тухайн хүн сайтад тэр дугаараараа нэвтэрч бүртгүүлсэн байх ёстой —
 * staff.id нь нэвтрэх бүртгэлтэй (auth.users) холбогддог.
 */
export async function addStaff(input: {
  phone: string;
  fullName: string;
  role: string;
}): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  if (!isStaffRole(input.role)) return { ok: false, error: "Эрх буруу байна" };
  const fullName = input.fullName.trim();
  if (!fullName) return { ok: false, error: "Нэр оруулна уу" };

  const parsed = parseRecipients(input.phone);
  if (parsed.valid.length !== 1 || parsed.invalid.length > 0) {
    return { ok: false, error: "Утасны дугаар буруу — 8 оронтой дугаар оруулна уу" };
  }
  const phone = parsed.valid[0];

  const supabase = await createClient();
  const { data: profiles, error: findErr } = await supabase
    .from("profiles")
    .select("id, phone, email")
    .in("phone", phoneVariants(phone))
    .limit(2);
  if (findErr) return { ok: false, error: findErr.message };
  if (!profiles || profiles.length === 0) {
    return {
      ok: false,
      error:
        "Энэ дугаараар бүртгэл олдсонгүй. Тэр хүн эхлээд сайтад энэ дугаараараа нэвтэрсэн байх ёстой",
    };
  }
  const profile = profiles[0];

  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("id", profile.id)
    .maybeSingle();
  if (existing) return { ok: false, error: "Энэ хүн аль хэдийн ажилтнаар бүртгэлтэй" };

  const { error } = await supabase.from("staff").insert({
    id: profile.id,
    full_name: fullName,
    // staff.email заавал, давтагдашгүй — утсаар нэвтэрдэг хүнд орлуулах хаяг
    email: profile.email || `phone-976${phone}@vidan.local`,
    phone,
    role: input.role,
    is_active: true,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Энэ имэйлтэй ажилтан аль хэдийн байна" : error.message,
    };
  }

  await logStaffActivity({
    action: "staff_add",
    summary: `Ажилтан нэмэв: ${fullName} — ${STAFF_ROLE_LABEL[input.role]}`,
    entityType: "staff",
    entityId: profile.id,
  });

  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Эрх солих, идэвхжүүлэх / идэвхгүй болгох */
export async function updateStaff(
  id: string,
  patch: { role?: string; is_active?: boolean },
): Promise<Result> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  if (patch.role !== undefined && !isStaffRole(patch.role)) {
    return { ok: false, error: "Эрх буруу байна" };
  }
  const clean: { role?: StaffRole; is_active?: boolean } = {};
  if (patch.role !== undefined) clean.role = patch.role as StaffRole;
  if (patch.is_active !== undefined) clean.is_active = !!patch.is_active;
  if (Object.keys(clean).length === 0) return { ok: true };

  const supabase = await createClient();
  const [{ data: target }, { count: admins }] = await Promise.all([
    supabase.from("staff").select("id, role, is_active, full_name").eq("id", id).maybeSingle(),
    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true),
  ]);
  if (!target) return { ok: false, error: "Ажилтан олдсонгүй" };

  const denied = checkStaffChange({
    actorId: guard.me.id,
    target,
    patch: clean,
    activeAdminCount: admins ?? 0,
  });
  if (denied) return { ok: false, error: denied };

  const { error } = await supabase.from("staff").update(clean).eq("id", id);
  if (error) return { ok: false, error: error.message };

  const changes: string[] = [];
  if (clean.role && clean.role !== target.role) {
    changes.push(`эрх ${STAFF_ROLE_LABEL[target.role as StaffRole] ?? target.role} → ${STAFF_ROLE_LABEL[clean.role]}`);
  }
  if (clean.is_active !== undefined && clean.is_active !== target.is_active) {
    changes.push(clean.is_active ? "идэвхжүүлсэн" : "идэвхгүй болгосон");
  }
  if (changes.length) {
    await logStaffActivity({
      action: "staff_update",
      summary: `Ажилтан ${target.full_name}: ${changes.join("; ")}`,
      entityType: "staff",
      entityId: id,
    });
  }

  revalidatePath("/admin/staff");
  return { ok: true };
}
