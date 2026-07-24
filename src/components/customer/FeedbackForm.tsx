"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/(customer)/feedback/actions";

const CATEGORIES = [
  { value: "suggestion", label: "Санал" },
  { value: "complaint", label: "Гомдол" },
  { value: "praise", label: "Талархал" },
  { value: "other", label: "Бусад" },
] as const;

export function FeedbackForm() {
  const [category, setCategory] = useState("suggestion");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const res = await submitFeedback({ name, phone, category, message });
    if (res.ok) {
      setStatus("ok");
      setMessage("");
    } else {
      setError(res.error);
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-lime-300 bg-lime-50 p-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border-[3px] border-lime-500 bg-lime-100 text-3xl text-lime-700">
          ✓
        </div>
        <h3 className="font-display mb-1 text-lg font-extrabold text-ink-900">
          Баярлалаа!
        </h3>
        <p className="text-sm text-ink-700">
          Таны санал хүсэлтийг хүлээн авлаа. Бид анхааралдаа авах болно.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-5 rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          Дахин илгээх
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 md:p-7"
    >
      {/* Category */}
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink-700">
          Төрөл
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={
                category === c.value
                  ? "rounded-full border-[1.5px] border-brand-600 bg-brand-50 px-4 py-1.5 text-[13px] font-bold text-brand-700"
                  : "rounded-full border-[1.5px] border-ink-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-ink-700 transition hover:border-brand-200"
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name + phone (optional) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink-700">
            Нэр <span className="font-normal text-ink-500">(заавал биш)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink-700">
            Утас <span className="font-normal text-ink-500">(заавал биш)</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="mb-1.5 block text-[13px] font-bold text-ink-700">
          Санал хүсэлт
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="Бидэнд юу таалагдсан, эсвэл юуг сайжруулах талаар бичнэ үү…"
          className="w-full resize-y rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-500"
        />
      </div>

      {status === "error" && (
        <div className="rounded-lg bg-brand-50 px-3.5 py-2.5 text-[13px] font-semibold text-brand-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="flex w-full items-center justify-center rounded-[12px] bg-brand-600 py-3.5 text-base font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:shadow-none"
      >
        {status === "sending" ? "Илгээж байна…" : "Илгээх"}
      </button>
    </form>
  );
}
