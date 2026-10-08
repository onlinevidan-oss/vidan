"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin-guard";

/** Санал хүсэлтийг шийдсэн / шийдээгүй гэж тэмдэглэх */
export async function setFeedbackHandled(
  id: string,
  handled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: guard.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .update({ is_handled: handled })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Санал хүсэлт олдсонгүй" };

  revalidatePath("/admin/feedback");
  return { ok: true };
}
