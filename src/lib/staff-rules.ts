/**
 * Ажилтны эрхийг өөрчлөх дүрэм — цэвэр функцууд.
 * Буруу өөрчлөлт нь бүх хүнийг админаас түгжиж болох тул нэг газар
 * төвлөрүүлж тестээр бэхэлнэ.
 */

export const STAFF_ROLES = ["admin", "manager", "staff", "driver"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Админ",
  manager: "Менежер",
  staff: "Ажилтан",
  driver: "Жолооч",
};

/** Эрх тус бүр юу хийж чадах вэ — жагсаалтын доор тайлбарлана */
export const STAFF_ROLE_HINT: Record<StaffRole, string> = {
  admin: "Бүх зүйл, ажилтны эрх удирдах",
  manager: "Бараа, агуулах, тохиргоо, захиалга",
  staff: "Захиалга харах, төлөв солих",
  driver: "Захиалга харах, төлөв солих",
};

export function isStaffRole(v: unknown): v is StaffRole {
  return (STAFF_ROLES as readonly unknown[]).includes(v);
}

type StaffState = { id: string; role: string; is_active: boolean };

/**
 * Өөрчлөлтийг зөвшөөрөх үү? Болохгүй бол шалтгааныг, болох бол null.
 *
 *  · Өөрийнхөө эрхийг бууруулах, өөрийгөө идэвхгүй болгохыг хориглоно —
 *    андуурч дарвал буцааж чадахгүй.
 *  · Идэвхтэй сүүлчийн админыг үлдээнэ — эс тэгвээс ажилтан удирдах хүн
 *    үлдэхгүй.
 */
export function checkStaffChange(args: {
  actorId: string;
  target: StaffState;
  patch: { role?: StaffRole; is_active?: boolean };
  /** Одоо идэвхтэй, role = admin ажилтны тоо */
  activeAdminCount: number;
}): string | null {
  const { actorId, target, patch, activeAdminCount } = args;
  const nextRole = patch.role ?? target.role;
  const nextActive = patch.is_active ?? target.is_active;

  if (target.id === actorId) {
    if (!nextActive) return "Өөрийгөө идэвхгүй болгох боломжгүй";
    if (nextRole !== target.role) return "Өөрийнхөө эрхийг өөрчлөх боломжгүй";
  }

  const wasActiveAdmin = target.is_active && target.role === "admin";
  const staysActiveAdmin = nextActive && nextRole === "admin";
  if (wasActiveAdmin && !staysActiveAdmin && activeAdminCount <= 1) {
    return "Сүүлчийн админыг хасах боломжгүй — эхлээд өөр админ томилно уу";
  }
  return null;
}

/**
 * 8 оронтой дугаарыг санд хадгалагдаж болох хэлбэрүүдээр нь буцаана.
 * profiles.phone ихэвчлэн "976XXXXXXXX", цөөн тохиолдолд 8 орноор байдаг.
 */
export function phoneVariants(phone8: string): string[] {
  return [`976${phone8}`, phone8, `+976${phone8}`];
}
