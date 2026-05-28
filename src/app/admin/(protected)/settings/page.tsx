import { StubPage } from "@/components/admin/StubPage";

export const metadata = { title: "Тохиргоо | VIDAN Backoffice" };

export default function AdminSettings() {
  return (
    <StubPage
      title="Тохиргоо"
      crumb="Дэлгүүр"
      emoji="⚙️"
      description="Дэлгүүрийн ерөнхий тохиргоо, төлбөрийн методууд, хүргэлт, баг гишүүд, интеграц."
      phase="Phase 12"
    />
  );
}
