import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/queries/staff";
import { getAdminAlerts } from "@/lib/queries/admin-alerts";
import { Sidebar } from "@/components/admin/Sidebar";
import { OrdersLive } from "@/components/admin/OrdersLive";
import { StaffNoTrack } from "@/components/analytics/StaffNoTrack";

export const metadata = { title: "VIDAN Backoffice" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Proxy аль хэдийн authentication шалгасан (нэвтрээгүй бол /login руу).
  // Энд role шалгана.
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/forbidden");

  const { newOrders } = await getAdminAlerts();

  const initials =
    staff.full_name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "S";

  return (
    <div className="min-h-screen bg-[#f6f3ec] text-ink-900 md:grid md:grid-cols-[240px_1fr] print:block print:min-h-0 print:bg-white">
      <Sidebar
        user={{
          fullName: staff.full_name,
          role: staff.role,
          initials,
        }}
        newOrders={newOrders}
      />
      <main className="flex min-h-screen min-w-0 flex-col print:min-h-0">{children}</main>
      {/* Шинэ захиалгыг хуудас дахин ачаалалгүй тусгана */}
      <OrdersLive />
      {/* Ажилтны браузерийг хэмжилтээс хасна */}
      <StaffNoTrack />
    </div>
  );
}
