import { StubPage } from "@/components/admin/StubPage";

export const metadata = { title: "Хэрэглэгч | VIDAN Backoffice" };

export default function AdminCustomers() {
  return (
    <StubPage
      title="Хэрэглэгч"
      crumb="Бүгд"
      emoji="👥"
      description="Хэрэглэгчдийн жагсаалт, профайл, захиалгын түүх, VIP segment."
      phase="Phase 8"
    />
  );
}
