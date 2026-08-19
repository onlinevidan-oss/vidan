"use client";

/**
 * Танилцуулга (PDF) удирдах — админ.
 *
 * PDF-ийг сервер рүү бүтнээр илгээхгүй: браузер дээр pdf.js-ээр хуудас бүрийг
 * зураг болгож (JPEG), Supabase storage руу байршуулаад зөвхөн URL жагсаалтыг
 * server action-д хадгална. Ингэснээр зочид 10+ МБ PDF татахгүй, гар утсан дээр
 * ч хурдан нээгдэнэ.
 */

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadAboutPage } from "@/lib/storage";
import { updateAboutBrochure } from "@/app/admin/(protected)/settings/actions";
import type { AboutBrochure, BrochurePage } from "@/lib/queries/settings";

/** Хуудасны зургийн өргөн (px) — сайтын багана 900px тул 1400 хангалттай */
const PAGE_WIDTH = 1400;
const JPEG_QUALITY = 0.8;
const MAX_PAGES = 60;

export function AboutBrochureForm({ initial }: { initial: AboutBrochure | null }) {
  const [pages, setPages] = useState<BrochurePage[]>(initial?.pages ?? []);
  const [title, setTitle] = useState(initial?.title ?? "Танилцуулга");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // ижил файлыг дахин сонгох боломжтой байлгана
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Зөвхөн PDF файл сонгоно уу");
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    setProgress("PDF уншиж байна…");

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buffer }).promise;
      const count = Math.min(pdf.numPages, MAX_PAGES);
      const batch = String(Date.now());
      const next: BrochurePage[] = [];

      for (let i = 1; i <= count; i++) {
        setProgress(`${i}/${count} хуудас боловсруулж байна…`);

        const page = await pdf.getPage(i);
        const scale = PAGE_WIDTH / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas үүсгэж чадсангүй");

        // PDF-ийн тунгалаг дэвсгэрийг цагаанаар дүүргэнэ (JPEG-д alpha байхгүй)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
        );
        if (!blob) throw new Error(`${i}-р хуудсыг зураг болгож чадсангүй`);

        const up = await uploadAboutPage(blob, batch, i);
        if (!up.ok) throw new Error(up.error);

        next.push({ url: up.url, width: canvas.width, height: canvas.height });
      }

      setProgress("Хадгалж байна…");
      const res = await updateAboutBrochure({ title, pages: next });
      if (!res.ok) throw new Error(res.error);

      setPages(next);
      setSaved(true);
      setProgress("");
    } catch (err) {
      setError((err as Error).message || "PDF боловсруулахад алдаа гарлаа");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Танилцуулгыг сайтаас хасах уу?")) return;
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await updateAboutBrochure({ title, pages: [] });
    if (res.ok) {
      setPages([]);
      setSaved(true);
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-bold text-ink-700">
          Танилцуулгын нэр
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
        />
      </div>

      <div className="rounded-[12px] border-[1.5px] border-dashed border-ink-300 bg-cream p-5 text-center">
        <p className="text-sm font-bold text-ink-900">
          {pages.length > 0
            ? `Одоо ${pages.length} хуудастай танилцуулга нийтлэгдсэн`
            : "Танилцуулга нийтлэгдээгүй байна"}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          PDF сонгоход хуудас бүр зураг болж хөрвөөд{" "}
          <strong>/about</strong> хуудсанд шууд солигдоно
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Боловсруулж байна…" : "PDF сонгох"}
          </button>
          {pages.length > 0 && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
            >
              Хасах
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {progress && (
          <p className="mt-3 text-xs font-semibold text-brand-700">{progress}</p>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        {saved && !busy && (
          <p className="mt-3 text-xs font-semibold text-green-700">
            ✓ Хадгалагдлаа
          </p>
        )}
      </div>

      {pages.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {pages.map((p, i) => (
            <div
              key={p.url}
              className="overflow-hidden rounded-[8px] border border-ink-200 bg-white"
            >
              <Image
                src={p.url}
                alt={`${i + 1}-р хуудас`}
                width={p.width}
                height={p.height}
                sizes="120px"
                className="w-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
