"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { updateHeroSlides } from "@/app/admin/(protected)/settings/actions";
import { uploadHeroImage } from "@/lib/storage";
import type { HeroSlide } from "@/lib/queries/settings";

const inputCls =
  "w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500";

const EMPTY: HeroSlide = {
  badge: "",
  title: "",
  body: "",
  btn_label: "",
  btn_href: "",
  image_url: "",
};

export function HeroSlidesForm({ initial }: { initial: HeroSlide[] }) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    initial.length ? initial : [{ ...EMPTY }],
  );
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  const setField = (i: number, key: keyof HeroSlide, val: string) =>
    setSlides((s) => s.map((sl, idx) => (idx === i ? { ...sl, [key]: val } : sl)));
  const addSlide = () => setSlides((s) => [...s, { ...EMPTY }]);
  const removeSlide = (i: number) =>
    setSlides((s) => s.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setSlides((s) => {
      const a = [...s];
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const res = await updateHeroSlides(slides);
    if (res.ok) {
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setErrorMsg(res.error);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-ink-500">
        Нүүр хуудсанд эргэлддэг постерууд. Зөвхөн зураг оруулбал цэвэр постер,
        текст нэмбэл гарчиг/товчтой болно. Дээрээс доош дараалалаар харагдана.
      </p>

      {slides.map((slide, i) => (
        <SlideEditor
          key={i}
          index={i}
          total={slides.length}
          slide={slide}
          onChange={(k, v) => setField(i, k, v)}
          onRemove={() => removeSlide(i)}
          onMove={(d) => move(i, d)}
        />
      ))}

      <button
        type="button"
        onClick={addSlide}
        className="w-full rounded-[10px] border-[1.5px] border-dashed border-ink-300 bg-white py-3 text-sm font-semibold text-ink-600 transition hover:border-brand-400 hover:text-brand-600"
      >
        + Слайд нэмэх
      </button>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-[10px] bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {status === "saving" ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {status === "ok" && (
          <span className="text-sm font-semibold text-lime-700">
            ✓ Хадгалагдлаа
          </span>
        )}
        {status === "error" && (
          <span className="text-sm font-semibold text-red-600">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}

function SlideEditor({
  index,
  total,
  slide,
  onChange,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  slide: HeroSlide;
  onChange: (key: keyof HeroSlide, val: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Зөвхөн JPG, PNG, WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Зураг 5MB-аас бага байх ёстой");
      return;
    }
    setUploading(true);
    setUploadError("");
    const res = await uploadHeroImage(file);
    setUploading(false);
    if (!res.ok) {
      setUploadError(res.error);
      return;
    }
    onChange("image_url", res.url);
  }

  const isSupabase =
    slide.image_url.startsWith("http") && slide.image_url.includes("supabase");
  const preview =
    isSupabase || slide.image_url.startsWith("/") ? slide.image_url : null;

  return (
    <div className="space-y-3 rounded-[12px] border-[1.5px] border-ink-200 bg-cream/40 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-700">
          Слайд {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn label="Дээш" disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </IconBtn>
          <IconBtn
            label="Доош"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            ↓
          </IconBtn>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Устгах
          </button>
        </div>
      </div>

      {/* Постер зураг */}
      <div>
        <label className="mb-1 block text-[13px] font-bold text-ink-700">
          Постер зураг
        </label>
        <div className="flex gap-2">
          <input
            value={slide.image_url}
            onChange={(e) => onChange("image_url", e.target.value)}
            className={inputCls}
            placeholder="Зураг URL эсвэл Upload дарна"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            {uploading ? "…" : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
        {uploadError && (
          <p className="mt-1 text-xs text-red-600">{uploadError}</p>
        )}
        {preview && (
          <div className="relative mt-2 aspect-[16/8] w-full max-w-sm overflow-hidden rounded-lg border border-ink-200 bg-ink-900">
            <Image
              src={preview}
              alt=""
              fill
              className="object-cover"
              unoptimized={isSupabase}
            />
          </div>
        )}
      </div>

      {/* Текст талбарууд (заавал биш) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={slide.badge}
          onChange={(e) => onChange("badge", e.target.value)}
          className={inputCls}
          placeholder="Badge (жнь: Онцгой хямдрал)"
        />
        <input
          value={slide.btn_href}
          onChange={(e) => onChange("btn_href", e.target.value)}
          className={inputCls}
          placeholder="Линк (жнь: /products)"
        />
      </div>
      <textarea
        value={slide.title}
        onChange={(e) => onChange("title", e.target.value)}
        rows={2}
        className={inputCls}
        placeholder="Гарчиг (мөр хуваахдаа Enter). Хоосон бол цэвэр постер."
      />
      <input
        value={slide.body}
        onChange={(e) => onChange("body", e.target.value)}
        className={inputCls}
        placeholder="Дэд текст (заавал биш)"
      />
      <input
        value={slide.btn_label}
        onChange={(e) => onChange("btn_label", e.target.value)}
        className={inputCls}
        placeholder="Товчлуурын текст (заавал биш)"
      />
    </div>
  );
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-ink-200 bg-white text-ink-600 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
