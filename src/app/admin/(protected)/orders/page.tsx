import { StubPage } from "@/components/admin/StubPage";

export const metadata = { title: "Захиалга | VIDAN Backoffice" };

export default function AdminOrders() {
  return (
    <StubPage
      title="Захиалга"
      crumb="Бүгд"
      emoji="📦"
      description="Захиалгын жагсаалт, статус удирдлага, түүх. Захиалга орж эхэлмэгц энд харагдана."
      phase="Phase 8"
    />
  );
}
