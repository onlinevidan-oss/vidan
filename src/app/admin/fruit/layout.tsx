import { redirect } from "next/navigation";
import { requireFruitAccess } from "@/lib/admin-guard";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/Sidebar";
import { StaffNoTrack } from "@/components/analytics/StaffNoTrack";

export const metadata = { title: "Жимс | Backoffice" };

/**
 * Vidan fruit-ийн админ (0048). Жимсний ажилтан болон VIDAN-ы админ,
 * менежер (хянах зорилгоор) орно. Энэ layout VIDAN-ы (protected)
 * бүлгээс тусдаа — жимсний ажилтан VIDAN-ы хуудас руу шилжвэл тэр
 * бүлгийн layout түүнийг энд буцаана.
 */
export default async function FruitAdminLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireFruitAccess();
  if (!guard.ok) redirect("/admin/forbidden");
  const { staff } = guard;

  const supabase = await createClient();
  const { error } = await supabase.rpc("touch_staff_login");
  if (error) console.error("[touch_staff_login failed]", error);

  const initials =
    staff.full_name?.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "F";

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-ink-900 md:grid md:grid-cols-[240px_1fr] print:block print:min-h-0 print:bg-white">
      <Sidebar user={{ fullName: staff.full_name, role: staff.role, initials }} variant="fruit" />
      <main className="flex min-h-screen min-w-0 flex-col print:min-h-0">{children}</main>
      <StaffNoTrack />
    </div>
  );
}
