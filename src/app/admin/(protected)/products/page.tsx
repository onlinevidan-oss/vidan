import { StubPage } from "@/components/admin/StubPage";

export const metadata = { title: "Бүтээгдэхүүн | VIDAN Backoffice" };

export default function AdminProducts() {
  return (
    <StubPage
      title="Бүтээгдэхүүн"
      crumb="Бүгд"
      emoji="🛒"
      description="Бүтээгдэхүүний CRUD, нөөц, үнэ, ангилал, зураг upload. Одоо database-д 8 бүтээгдэхүүн бэлэн байна."
      phase="Phase 5"
    />
  );
}
