"use client";

/**
 * Жимсний барааны зураг нэмэх, устгах. Зургийг бусад бараатай ижил
 * 870×870, цагаан дэвсгэртэй болгоод (normalizeProductImage) сервер рүү
 * илгээнэ — жимсний ажилтан storage-д шууд бичих эрхгүй.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { normalizeProductImage } from "@/lib/image-normalize";
import { removeFruitProductImage, uploadFruitProductImage } from "@/app/admin/fruit/actions";

export function FruitImageManager({
  productId,
  name,
  images,
}: {
  productId: string;
  name: string;
  images: { id: string; url: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError("Зураг 10MB-аас бага байх ёстой");
    setError(null);
    setWarn(false);
    start(async () => {
      let normalized;
      try {
        normalized = await normalizeProductImage(file);
      } catch {
        setError("Зургийг уншиж чадсангүй — өөр файл оруулна уу");
        return;
      }
      const form = new FormData();
      form.append("file", new File([normalized.blob], "image.jpg", { type: "image/jpeg" }));
      const r = await uploadFruitProductImage(productId, form);
      if (!r.ok) return setError(r.error);
      setWarn(!normalized.whiteBackground);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="mb-3 font-bold text-ink-900">{name}</div>
      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative h-28 w-28 overflow-hidden rounded-xl border border-ink-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-contain" />
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Энэ зургийг устгах уу?")) return;
                start(async () => {
                  const r = await removeFruitProductImage(img.id);
                  if (!r.ok) setError(r.error);
                  else router.refresh();
                });
              }}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink-900/70 text-xs text-white hover:bg-brand-600"
              aria-label="Зураг устгах"
            >
              ✕
            </button>
          </div>
        ))}
        <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-ink-300 text-center text-xs font-bold text-ink-500 hover:border-brand-500 hover:text-brand-700">
          {pending ? "…" : "＋ Зураг"}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={pending} />
        </label>
      </div>
      {warn && <div className="mt-2 text-xs text-[#9a6200]">Зургийн дэвсгэр цагаан биш байна — бусад бараатай зохицохгүй байж магадгүй</div>}
      {error && <div className="mt-2 text-xs font-semibold text-brand-700">⚠️ {error}</div>}
    </div>
  );
}
