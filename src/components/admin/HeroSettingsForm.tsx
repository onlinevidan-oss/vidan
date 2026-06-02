"use client";

import { useState } from "react";
import Image from "next/image";
import { updateHeroSettings } from "@/app/admin/(protected)/settings/actions";
import type { HeroSettings } from "@/lib/queries/settings";

export function HeroSettingsForm({ initial }: { initial: HeroSettings }) {
  const [form, setForm] = useState<HeroSettings>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(key: keyof HeroSettings, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const res = await updateHeroSettings(form);
    if (res.ok) {
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setErrorMsg(res.error);
      setStatus("error");
    }
  }

  const isSupabaseUrl =
    form.image_url.startsWith("http") &&
    form.image_url.includes("supabase");
  const previewSrc = isSupabaseUrl || form.image_url.startsWith("/")
    ? form.image_url
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Badge */}
      <Field label="Badge текст" hint="Товчлуурны дээрх жижиг шошго">
        <input
          value={form.badge}
          onChange={(e) => set("badge", e.target.value)}
          className={inputCls}
          placeholder="🌱 Үндэсний үйлдвэрлэл · 1998 оноос"
        />
      </Field>

      {/* Title */}
      <Field label="Гарчиг" hint="Том том гарчиг — мөр хуваахдаа Enter дарна">
        <textarea
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          rows={3}
          className={inputCls}
          placeholder="Эрүүл хөрсөнд&#10;ургуулсан эрүүл хүнс"
        />
      </Field>

      {/* Body */}
      <Field label="Дэд текст" hint="Гарчигийн доорх тайлбар хэсэг">
        <textarea
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          rows={3}
          className={inputCls}
        />
      </Field>

      {/* Button */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Товчлуурын текст">
          <input
            value={form.btn_label}
            onChange={(e) => set("btn_label", e.target.value)}
            className={inputCls}
            placeholder="Бүтээгдэхүүн үзэх →"
          />
        </Field>
        <Field label="Товчлуурын линк">
          <input
            value={form.btn_href}
            onChange={(e) => set("btn_href", e.target.value)}
            className={inputCls}
            placeholder="/products"
          />
        </Field>
      </div>

      {/* Image URL */}
      <Field
        label="Зургийн URL"
        hint="Supabase storage URL эсвэл /public дотрох зам (жнь. /vidan-leaf.png)"
      >
        <input
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          className={inputCls}
          placeholder="/vidan-leaf.png"
        />
        {previewSrc && (
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-ink-200 bg-ink-100">
              <Image
                src={previewSrc}
                alt="preview"
                fill
                className="object-contain p-1"
                unoptimized={isSupabaseUrl}
              />
            </div>
            <span className="text-xs text-ink-500">Урьдчилан харах</span>
          </div>
        )}
      </Field>

      {/* Preview strip */}
      <div className="rounded-[14px] bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-3 py-1 text-xs font-bold text-ink-900">
          {form.badge || "badge"}
        </span>
        <h2 className="font-display whitespace-pre-line text-2xl font-black leading-tight">
          {form.title || "Гарчиг"}
        </h2>
        <p className="mt-2 text-sm opacity-90">{form.body}</p>
        <span className="mt-3 inline-block rounded-[8px] bg-white px-4 py-2 text-sm font-bold text-brand-700">
          {form.btn_label}
        </span>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-[10px] bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {status === "saving" ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        {status === "ok" && (
          <span className="text-sm font-semibold text-lime-600">✓ Амжилттай хадгалагдлаа</span>
        )}
        {status === "error" && (
          <span className="text-sm font-semibold text-red-600">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-ink-900">{label}</label>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)] w-full";
