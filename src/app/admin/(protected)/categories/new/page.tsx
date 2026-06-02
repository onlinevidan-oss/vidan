import { TopBar } from "@/components/admin/TopBar";
import { createCategory } from "../actions";
import { CategoryForm } from "../CategoryForm";

export const metadata = { title: "Шинэ ангилал | VIDAN Backoffice" };

export default function NewCategoryPage() {
  return (
    <>
      <TopBar title="Ангилал" crumb="Шинэ" />
      <div className="flex-1 p-7">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Шинэ ангилал
          </h1>
        </div>
        <div className="max-w-2xl rounded-2xl border border-ink-200 bg-white p-6">
          <CategoryForm action={createCategory} submitLabel="Үүсгэх" />
        </div>
      </div>
    </>
  );
}
