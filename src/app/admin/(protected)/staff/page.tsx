import { TopBar } from "@/components/admin/TopBar";
import { StaffManager, type StaffListRow } from "@/components/admin/StaffManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/queries/staff";
import { StaffActivityLog, type ActivityRow } from "@/components/admin/StaffActivityLog";

export const metadata = { title: "Ажилтан | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminStaff({ searchParams }: PageProps<"/admin/staff">) {
  const sp = await searchParams;
  const whoRaw = Array.isArray(sp.who) ? sp.who[0] : sp.who;
  const me = await getCurrentStaff();

  // Ажилтны эрхийг зөвхөн админ удирдана (actions.ts-ийн шалгалттай ижил)
  if (!me || me.role !== "admin") {
    return (
      <>
        <TopBar title="Ажилтан" />
        <div className="grid grid-cols-1 flex-1 place-items-center p-4 sm:p-7">
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
    .select("id, full_name, phone, email, role, is_active, created_at, last_login_at")
    .order("created_at");

  // Хэн юу хийсэн — сүүлийн 200, хүнээр шүүж болно
  const who = whoRaw && (data ?? []).some((s) => s.id === whoRaw) ? whoRaw : null;
  let activityQ = supabase
    .from("staff_activity")
    .select("id, actor_id, actor_name, actor_role, action, summary, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (who) activityQ = activityQ.eq("actor_id", who);
  const { data: activity } = await activityQ;

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
        <StaffActivityLog
          rows={(activity ?? []) as ActivityRow[]}
          people={(data ?? []).map((s) => ({
            id: s.id,
            full_name: s.full_name,
            role: s.role,
            last_login_at: s.last_login_at,
          }))}
          selected={who}
        />
      </div>
    </>
  );
}
