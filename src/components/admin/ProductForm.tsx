"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
  type ProductFormPayload,
} from "@/app/admin/(protected)/products/actions";
import { uploadProductImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";

type Category = { id: string; name_mn: string };
type Image = { id: string; url: string };

type Mode = "create" | "edit";

export function ProductForm({
  mode,
  initialId,
  initialValues,
  categories,
  initialImages = [],
}: {
  mode: Mode;
  initialId?: string;
  initialValues?: Partial<ProductFormPayload>;
  categories: Category[];
  initialImages?: Image[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<Image[]>(initialImages);

  // Form state
  const [v, setV] = useState<ProductFormPayload>({
    sku: initialValues?.sku ?? "",
    name_mn: initialValues?.name_mn ?? "",
    name_en: initialValues?.name_en ?? "",
    slug: initialValues?.slug ?? "",
    category_id: initialValues?.category_id ?? categories[0]?.id ?? "",
    short_description: initialValues?.short_description ?? "",
    description: initialValues?.description ?? "",
    price: initialValues?.price ?? 0,
    old_price: initialValues?.old_price ?? null,
    cost_price: initialValues?.cost_price ?? null,
    stock: initialValues?.stock ?? 0,
    stock_threshold: initialValues?.stock_threshold ?? 20,
    weight_net_g: initialValues?.weight_net_g ?? null,
    weight_gross_g: initialValues?.weight_gross_g ?? null,
    shelf_life: initialValues?.shelf_life ?? "",
    is_active: initialValues?.is_active ?? true,
    is_featured: initialValues?.is_featured ?? false,
    is_new: initialValues?.is_new ?? false,
    is_bio: initialValues?.is_bio ?? false,
    tags: initialValues?.tags ?? [],
    meta_description: initialValues?.meta_description ?? "",
  });

  const [tagInput, setTagInput] = useState("");

  function update<K extends keyof ProductFormPayload>(key: K, value: ProductFormPayload[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-slug from name (Cyrillic → Latin transliteration)
  // Create mode: always regenerate as user types
  // Edit mode: don't auto-replace (admin might have customized)
  function onNameChange(name: string) {
    update("name_mn", name);
    if (mode === "create") {
      update("slug", slugify(name));
    }
  }

  // Slug field manual edits get normalized (replace invalid chars)
  function onSlugChange(value: string) {
    // Allow user to type freely but normalize invalid chars
    const cleaned = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    update("slug", cleaned);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || v.tags.includes(t)) return;
    update("tags", [...v.tags, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    update("tags", v.tags.filter((x) => x !== t));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !initialId) return;

    // Client-side урьдчилсан validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Зөвхөн JPG, PNG, WEBP хүлээж авна");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Зургийн хэмжээ 5MB-аас бага байх ёстой");
      return;
    }

    // Input-ийг цэвэрлэх — ижил файлыг 2 дахин upload хийх боломжтой болгох
    e.target.value = "";

    setUploading(true);
    setError(null);
    const result = await uploadProductImage(file, initialId);
    if (!result.ok) {
      setError(result.error);
      setUploading(false);
      return;
    }
    // Серверт бүртгүүлж бодит id-г буцаан авах
    const add = await addProductImage(initialId, result.url);
    if (!add.ok || !add.id) {
      setError(add.ok ? "Image add failed" : add.error);
      setUploading(false);
      return;
    }
    setImages([...images, { id: add.id, url: result.url }]);
    setUploading(false);
    router.refresh();
  }

  async function handleRemoveImage(id: string) {
    // Optimistic remove
    const prev = images;
    setImages(images.filter((i) => i.id !== id));
    const res = await removeProductImage(id);
    if (!res.ok) {
      setError("Зураг устгахад алдаа гарлаа");
      setImages(prev);
      return;
    }
    router.refresh();
  }

  function submit() {
    setError(null);

    // Validation
    if (!v.name_mn.trim()) return setError("Нэр оруулна уу");
    if (!v.sku.trim()) return setError("SKU оруулна уу");
    if (!v.slug.trim()) return setError("URL slug оруулна уу");
    if (!v.category_id) return setError("Ангилал сонгоно уу");
    if (v.price <= 0) return setError("Үнэ 0-ээс их байх ёстой");
    if (v.stock < 0) return setError("Нөөц 0-ээс бага байж болохгүй");

    startTransition(async () => {
      const result = mode === "create"
        ? await createProduct(v)
        : await updateProduct(initialId!, v);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (mode === "create" && result.ok && "id" in result) {
        router.push(`/admin/products/${result.id}`);
      } else {
        router.push("/admin/products");
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    if (!initialId) return;
    if (!confirm("Энэ бүтээгдэхүүнийг устгахдаа итгэлтэй байна уу?")) return;
    startTransition(async () => {
      await deleteProduct(initialId);
      router.push("/admin/products");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      {/* LEFT */}
      <div className="space-y-5">
        <Section title="Үндсэн мэдээлэл">
          <Field label="Нэр (Монгол) *" required>
            <input
              type="text"
              value={v.name_mn}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Жнь: Гүзээлзгэний чанамал, 450г"
              className={inputCls}
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="SKU *" required>
              <input
                type="text"
                value={v.sku}
                onChange={(e) => update("sku", e.target.value.toUpperCase())}
                placeholder="VDN-000"
                className={inputCls}
              />
            </Field>
            <Field label="URL slug *" required>
              <input
                type="text"
                value={v.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="produktiin-ner"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Богино тайлбар">
            <input
              type="text"
              value={v.short_description ?? ""}
              onChange={(e) => update("short_description", e.target.value)}
              placeholder="1-2 өгүүлбэр"
              className={inputCls}
            />
          </Field>
          <Field label="Дэлгэрэнгүй тайлбар">
            <textarea
              value={v.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              className={`${inputCls} resize-y min-h-[100px]`}
            />
          </Field>
        </Section>

        {mode === "edit" && (
          <Section title="Зураг">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl bg-cream-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(img.id)}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-white text-center text-xs text-ink-500 transition hover:border-brand-500 hover:text-brand-700">
                {uploading ? (
                  <span>Хадгалж байна…</span>
                ) : (
                  <span>
                    <span className="text-2xl block">＋</span>
                    Зураг
                  </span>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              JPG, PNG, WEBP · Дээд тал нь 5MB
            </p>
          </Section>
        )}

        {mode === "create" && (
          <div className="rounded-xl border border-lime-300 bg-lime-50 p-4 text-sm text-ink-700">
            💡 Бүтээгдэхүүнийг хадгалсны дараа <strong>зураг нэмж</strong> болно.
          </div>
        )}

        <Section title="Үнэ ба нөөц">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Худалдааны үнэ (₮) *" required>
              <input
                type="number"
                min={0}
                value={v.price || ""}
                onChange={(e) => update("price", Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
            <Field label="Хуучин үнэ (хямдрал)">
              <input
                type="number"
                min={0}
                value={v.old_price ?? ""}
                onChange={(e) =>
                  update("old_price", e.target.value ? Number(e.target.value) : null)
                }
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Өртөг үнэ">
              <input
                type="number"
                min={0}
                value={v.cost_price ?? ""}
                onChange={(e) =>
                  update("cost_price", e.target.value ? Number(e.target.value) : null)
                }
                className={inputCls}
              />
            </Field>
            <Field label="Одоогийн нөөц *" required>
              <input
                type="number"
                min={0}
                value={v.stock}
                onChange={(e) => update("stock", Math.max(0, Number(e.target.value) || 0))}
                className={inputCls}
              />
            </Field>
            <Field label="Доод хязгаар">
              <input
                type="number"
                min={0}
                value={v.stock_threshold ?? 20}
                onChange={(e) => update("stock_threshold", Number(e.target.value) || 0)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="Хэмжээ">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Цэвэр жин (г)">
              <input
                type="number"
                min={0}
                value={v.weight_net_g ?? ""}
                onChange={(e) =>
                  update("weight_net_g", e.target.value ? Number(e.target.value) : null)
                }
                className={inputCls}
              />
            </Field>
            <Field label="Хадгалах хугацаа">
              <input
                type="text"
                value={v.shelf_life ?? ""}
                placeholder="18 сар (0-25°C)"
                onChange={(e) => update("shelf_life", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* RIGHT */}
      <div className="space-y-5">
        <Section title="Төлөв">
          <Toggle label="Идэвхтэй" desc="Дэлгүүрт харагдана"
            checked={v.is_active} onChange={(b) => update("is_active", b)} />
          <Toggle label="⭐ Онцлох" desc="Нүүр хуудсанд гарна"
            checked={v.is_featured} onChange={(b) => update("is_featured", b)} />
          <Toggle label="🆕 Шинээр гарсан" desc="ШИНЭ tag харагдана"
            checked={v.is_new} onChange={(b) => update("is_new", b)} />
          <Toggle label="🌱 BIO" desc="BIO tag харагдана"
            checked={v.is_bio} onChange={(b) => update("is_bio", b)} />
        </Section>

        <Section title="Ангилал *">
          <select
            value={v.category_id}
            onChange={(e) => update("category_id", e.target.value)}
            className={inputCls}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_mn}
              </option>
            ))}
          </select>

          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Tag-ууд
            </label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border-[1.5px] border-ink-200 bg-white p-2">
              {v.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-700"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="+ tag"
                className="min-w-[100px] flex-1 border-0 bg-transparent text-xs outline-none"
              />
            </div>
          </div>
        </Section>

        <Section title="SEO / Meta">
          <Field label="Meta description">
            <textarea
              value={v.meta_description ?? ""}
              onChange={(e) => update("meta_description", e.target.value)}
              rows={3}
              className={`${inputCls} resize-y min-h-[70px]`}
              placeholder="Google search-д харагдах товч тайлбар (160 тэмдэгт)"
            />
          </Field>
        </Section>

        {error && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-700">
            ⚠️ {error}
          </div>
        )}

        <div className="sticky bottom-4 space-y-2">
          <button
            onClick={submit}
            disabled={pending}
            className="w-full rounded-[10px] bg-brand-600 px-4 py-3.5 font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:opacity-50"
          >
            {pending
              ? "Хадгалж байна…"
              : mode === "create"
                ? "＋ Бүтээгдэхүүн нэмэх"
                : "💾 Хадгалах"}
          </button>
          <Link
            href="/admin/products"
            className="block rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-center text-sm font-bold text-ink-700 hover:border-brand-500 hover:text-brand-700"
          >
            Цуцлах
          </Link>
          {mode === "edit" && (
            <button
              onClick={handleDelete}
              disabled={pending}
              className="w-full rounded-[10px] border-[1.5px] border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
            >
              🗑 Устгах
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <h3 className="font-display mb-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-700">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </div>
      {children}
    </label>
  );
}

function Toggle({
  label, desc, checked, onChange,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <div>
        <div className="text-sm font-bold text-ink-900">{label}</div>
        {desc && <div className="text-xs text-ink-500">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "bg-brand-600" : "bg-ink-200"}`}
      >
        <span
          className={`absolute top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
