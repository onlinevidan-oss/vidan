import { TopBar } from "@/components/admin/TopBar";
import { StaffManager, type StaffListRow } from "@/components/admin/StaffManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/queries/staff";

export const metadata = { title: "Ажилтан | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminStaff() {
  const me = await getCurrentStaff();

  // Ажилтны эрхийг зөвхөн админ удирдана (actions.ts-ийн шалгалттай ижил)
  if (!me || me.role !== "admin") {
    return (
      <>
        <TopBar title="Ажилтан" />
        <div className="grid flex-1 place-items-center p-7">
          <div className="max-w-[420px] rounded-2xl border border-ink-200 bg-white p-10 text-center">
            <div className="mb-4 text-5xl">🔒</div>
            <h2 className="font-display mb-2 text-xl font-extrabold text-ink-900">
              Хандах эрхгүй
            </h2>
            <p className="text-sm text-ink-700">
              Ажилтны эрхийг зөвхөн админ удирдана.
            </p>
          </div>
        </div>
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, full_name, phone, email, role, is_active, created_at")
    .order("created_at");

  const staff: StaffListRow[] = (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    email: s.email.endsWith("@vidan.local") ? null : s.email,
    role: s.role,
    is_active: s.is_active,
  }));
  const active = staff.filter((s) => s.is_active).length;

  return (
    <>
      <TopBar title="Ажилтан" crumb="Эрх" />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Ажилтнууд
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Админ хэсэгт нэвтрэх эрхтэй хүмүүс —{" "}
            <strong className="text-ink-900">{active}</strong> идэвхтэй
          </div>
        </div>
        <StaffManager staff={staff} meId={me.id} />
      </div>
    </>
  );
}
