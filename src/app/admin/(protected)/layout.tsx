import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/queries/staff";
import { Sidebar } from "@/components/admin/Sidebar";

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

  const initials =
    staff.full_name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "S";

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-[#f6f3ec] text-ink-900">
      <Sidebar
        user={{
          fullName: staff.full_name,
          role: staff.role,
          initials,
        }}
      />
      <main className="min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
