"use client";

import { useState } from "react";
import { updateCommerceSettings } from "@/app/admin/(protected)/settings/actions";
import { formatMnt } from "@/lib/utils";
import type { CommerceSettings } from "@/lib/pricing";

export function CommerceSettingsForm({
  initial,
}: {
  initial: CommerceSettings;
}) {
  const [form, setForm] = useState<CommerceSettings>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  function setNum(key: keyof CommerceSettings, val: string) {
    const n = Number(val.replace(/\D/g, ""));
    setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : 0 }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const res = await updateCommerceSettings(form);
    if (res.ok) {
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2500);
    } else {
      setErrorMsg(res.error);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        label="Захиалгын доод дүн (₮)"
        hint="Үүнээс бага дүнтэй сагс захиалга өгөх боломжгүй"
        value={form.min_order_amount}
        onChange={(v) => setNum("min_order_amount", v)}
      />
      <Field
        label="Хүргэлтийн төлбөр (₮)"
        hint="Захиалга бүрд нэмэгдэх хүргэлтийн суурь төлбөр"
        value={form.shipping_base}
        onChange={(v) => setNum("shipping_base", v)}
      />

      {/* Үнэгүй хүргэлт */}
      <div className="rounded-xl border-[1.5px] border-ink-200 p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-ink-900">
              Үнэгүй хүргэлт
            </div>
            <div className="mt-0.5 text-xs text-ink-500">
              {form.free_shipping_enabled
                ? `${formatMnt(form.free_shipping_min)}-с дээш захиалгад хүргэлт үнэгүй`
                : "Одоогоор идэвхгүй — бүх захиалгад хүргэлтийн төлбөр авна"}
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.free_shipping_enabled}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                free_shipping_enabled: e.target.checked,
              }))
            }
            className="h-5 w-5 accent-brand-600"
          />
        </label>

        {form.free_shipping_enabled && (
          <div className="mt-4">
            <Field
              label="Үнэгүй хүргэлтийн босго (₮)"
              hint="Энэ дүнгээс дээш захиалгад хүргэлт үнэгүй болно"
              value={form.free_shipping_min}
              onChange={(v) => setNum("free_shipping_min", v)}
            />
          </div>
        )}
      </div>

      {/* Урьдчилан харах */}
      <div className="rounded-xl bg-ink-100 p-4 text-[13px] leading-relaxed text-ink-700">
        <strong className="text-ink-900">Одоогийн дүрэм:</strong>{" "}
        {formatMnt(form.min_order_amount)}-с доош захиалга авахгүй · Хүргэлт{" "}
        {formatMnt(form.shipping_base)}
        {form.free_shipping_enabled
          ? ` · ${formatMnt(form.free_shipping_min)}-с дээш бол үнэгүй`
          : " (бүх захиалгад)"}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-[10px] bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:bg-ink-300"
        >
          {status === "saving" ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {status === "ok" && (
          <span className="text-sm font-semibold text-[#2da764]">
            ✓ Хадгалагдлаа
          </span>
        )}
        {status === "error" && (
          <span className="text-sm font-semibold text-brand-600">
            {errorMsg}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold text-ink-700">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={value.toLocaleString("en-US")}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-500"
      />
      <div className="mt-1 text-xs text-ink-500">{hint}</div>
    </div>
  );
}
