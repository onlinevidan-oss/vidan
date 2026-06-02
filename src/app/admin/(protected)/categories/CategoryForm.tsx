import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export function CategoryForm({
  category,
  action,
  submitLabel,
}: {
  category?: Partial<CategoryRow>;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Монгол нэр *" name="name_mn" defaultValue={category?.name_mn ?? ""} required placeholder="жж. Цай" />
        <Field label="Англи нэр" name="name_en" defaultValue={category?.name_en ?? ""} placeholder="e.g. Tea" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Slug *"
          name="slug"
          defaultValue={category?.slug ?? ""}
          required
          placeholder="tsai"
          hint="URL-д ашиглагдах үг. Жж: tsai, coffee"
        />
        <Field
          label="Дараалал"
          name="sort_order"
          type="number"
          defaultValue={String(category?.sort_order ?? 0)}
          placeholder="0"
          hint="Бага тоо — эхэнд гарна"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Emoji" name="emoji" defaultValue={category?.emoji ?? ""} placeholder="🍵" />
        <Field
          label="Өнгөний gradient"
          name="color_gradient"
          defaultValue={category?.color_gradient ?? ""}
          placeholder="linear-gradient(135deg,#d72327,#b5d33d)"
          hint="CSS gradient эсвэл hex өнгө"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={category?.is_active ?? true}
            className="h-4 w-4 rounded border-ink-300 accent-brand-600"
          />
          <span className="text-sm font-semibold text-ink-800">Идэвхтэй</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="is_featured"
            defaultChecked={category?.is_featured ?? false}
            className="h-4 w-4 rounded border-ink-300 accent-brand-600"
          />
          <span className="text-sm font-semibold text-ink-800">Онцлох (нүүр хуудсанд)</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-700"
        >
          {submitLabel}
        </button>
        <a
          href="/admin/categories"
          className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
        >
          Цуцлах
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold text-ink-700">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="rounded-lg border-[1.5px] border-ink-200 bg-cream px-3 py-2.5 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white"
      />
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}
