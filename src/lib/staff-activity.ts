/**
 * Ажилтны үйлдлийн түүх (staff_activity, 0046) — хэн, ямар эрхээр, юу хийв.
 *
 * Нэр, эрхийг сан өөрөө (trigger) нэвтэрсэн хүнээс бөглөнө — энд зөвхөн
 * юу хийснийг дамжуулна. Best-effort: бүртгэл бичигдээгүй ч үндсэн үйлдэл
 * (бараа хадгалах г.м.) амжилттай хэвээр — алдааг log хийгээд өнгөрнө.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type StaffActivityEntry = {
  /** Машинд уншигдах төрөл — жнь. "product_update", "order_status" */
  action: string;
  /** Хүнд уншигдах тайлбар — жнь. "Бараа засав: Өргөст хэмх 720г" */
  summary: string;
  entityType?: string;
  entityId?: string;
};

export async function logStaffActivity(entry: StaffActivityEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("staff_activity").insert({
      action: entry.action,
      summary: entry.summary.slice(0, 500),
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
    });
    if (error) console.error("[staff activity insert failed]", error);
  } catch (e) {
    console.error("[staff activity failed]", e);
  }
}
