"use client";

/**
 * SMS мэдэгдлийн тохиргоо — админ.
 *
 * Хэрэглэгч рүү явах SMS-ийг бүрэн удирдана: аль нь явах, ямар текстээр.
 * Кирилл SMS нэг segment = 70 тэмдэгт тул тэмдэгтийн тоо болон segment-ийг
 * бичиж байхад харуулна — урт SMS нь илүү төлбөр.
 *
 * Хүргэлтийн явцын SMS (бэлтгэж байна / хүргэлтэд / хүргэгдсэн) байхгүй:
 * захиалагч сайт дээрээсээ real-time хардаг.
 */

import { useState, useTransition } from "react";
import { updateSmsSettings } from "@/app/admin/(protected)/settings/actions";
import type { SmsSettings } from "@/lib/queries/settings";

/** Кирилл SMS — нэг segment 70 тэмдэгт */
const SEGMENT_CHARS = 70;

/** Урьдчилсан харагдац — жишээ захиалгаар */
function preview(template: string): string {
  return template
    .replaceAll("{order}", "#10281")
    .replaceAll("{total}", "26,690₮");
}

function segments(text: string): number {
  return Math.max(1, Math.ceil(text.length / SEGMENT_CHARS));
}

export function SmsSettingsForm({ initial }: { initial: SmsSettings }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof SmsSettings>(k: K, v: SmsSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateSmsSettings(form);
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SmsBlock
        title="Захиалга баталгаажсан"
        desc="Төлбөр төлөгдсөн даруйд захиалагч рүү явна"
        enabled={form.paid_enabled}
        onToggle={(v) => set("paid_enabled", v)}
        template={form.paid_template}
        onTemplate={(v) => set("paid_template", v)}
      />

      <SmsBlock
        title="Захиалга цуцлагдсан"
        desc="Админ захиалгыг цуцлахад явна"
        enabled={form.cancelled_enabled}
        onToggle={(v) => set("cancelled_enabled", v)}
        template={form.cancelled_template}
        onTemplate={(v) => set("cancelled_template", v)}
      />

      <div className="rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-700">
        <strong className="text-ink-900">Орлуулах утга:</strong>{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-bold">
          {"{order}"}
        </code>{" "}
        захиалгын дугаар ·{" "}
        <code className="rounded bg-white px-1.5 py-0.5 font-bold">
          {"{total}"}
        </code>{" "}
        нийт дүн
        <div className="mt-2 text-ink-500">
          Хүргэлтийн явцын SMS (бэлтгэж байна / хүргэлтэд / хүргэгдсэн)
          илгээгддэггүй — захиалагч сайт дээрээсээ шууд хардаг. Нэг захиалгад
          ижил SMS хоёр удаа явахгүй.
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}
      {saved && !pending && (
        <div className="rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-700">
          ✓ Хадгалагдлаа
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:bg-ink-300"
      >
        {pending ? "Хадгалж байна…" : "Хадгалах"}
      </button>
    </form>
  );
}

function SmsBlock({
  title, desc, enabled, onToggle, template, onTemplate,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  template: string;
  onTemplate: (v: string) => void;
}) {
  const text = preview(template);
  const seg = segments(text);

  return (
    <div
      className={`rounded-xl border-[1.5px] p-4 transition ${
        enabled ? "border-ink-200 bg-white" : "border-ink-200 bg-ink-100"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-bold text-ink-900">{title}</span>
          <span className="block text-xs text-ink-500">{desc}</span>
        </span>
      </label>

      {enabled && (
        <div className="mt-3.5">
          <textarea
            value={template}
            onChange={(e) => onTemplate(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-ink-500">
              Захиалагч харах:{" "}
              <span className="font-semibold text-ink-900">{text}</span>
            </span>
            <span
              className={
                seg > 1 ? "font-bold text-warn" : "font-bold text-ink-500"
              }
            >
              {text.length} тэмдэгт · {seg} SMS
              {seg > 1 && " (төлбөр өснө)"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
