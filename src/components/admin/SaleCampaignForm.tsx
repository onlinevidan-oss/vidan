"use client";

/**
 * Хямдралын кампанит ажил — админ.
 *
 * Хадгалахад үнэ ШУУД тохируулагдана (сервер дээр sync_sale_campaign()
 * дуудагдана). Цаг тутмын cron нь зөвхөн хугацаа эхлэх/дуусахыг
 * автоматаар барихад зориулагдсан.
 *
 * ОГНОО: талбарууд Улаанбаатарын цагаар (UTC+8). Админ хаанаас ч
 * нэвтэрсэн ижил утга харагдана — браузерын бүсээс хамаарахгүй.
 */

import { useState, useTransition } from "react";
import { updateSaleCampaign } from "@/app/admin/(protected)/settings/actions";
import type { SaleCampaign } from "@/lib/queries/settings";

const UB_OFFSET = "+08:00";

/** ISO(UTC) → "YYYY-MM-DDTHH:mm" Улаанбаатарын цагаар */
function isoToUbInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ub = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return ub.toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" (UB) → ISO(UTC) */
function ubInputToIso(v: string): string {
  if (!v) return "";
  const d = new Date(`${v}:00${UB_OFFSET}`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function ubLabel(iso: string): string {
  if (!iso) return "—";
  const v = isoToUbInput(iso);
  if (!v) return "—";
  const [date, time] = v.split("T");
  const [y, m, d] = date.split("-");
  return `${y}.${m}.${d} ${time}`;
}

export function SaleCampaignForm({
  initial,
  brands,
  discountedCount,
}: {
  initial: SaleCampaign;
  brands: { slug: string; name: string }[];
  discountedCount: number;
}) {
  const [form, setForm] = useState({
    ...initial,
    starts_at: isoToUbInput(initial.starts_at),
    ends_at: isoToUbInput(initial.ends_at),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setMsg(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await updateSaleCampaign({
        ...form,
        percent: Number(form.percent),
        starts_at: ubInputToIso(form.starts_at),
        ends_at: ubInputToIso(form.ends_at),
      } as SaleCampaign);

      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMsg(
        `Хадгаллаа — ${res.active ? "хямдрал ИДЭВХТЭЙ" : "хямдрал идэвхгүй"}` +
          (res.applied ? ` · ${res.applied} бараа хямдарлаа` : "") +
          (res.reverted ? ` · ${res.reverted} бараа хэвэндээ орлоо` : ""),
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Одоогийн байдал */}
      <div
        className={`rounded-xl border-[1.5px] p-4 ${
          discountedCount > 0
            ? "border-brand-200 bg-brand-50"
            : "border-ink-200 bg-cream"
        }`}
      >
        <div className="text-sm font-bold text-ink-900">
          {discountedCount > 0
            ? `🔥 Одоо ${discountedCount} бараа хямдралтай`
            : "Одоо хямдрал идэвхгүй"}
        </div>
        <div className="mt-1 text-xs text-ink-500">
          {ubLabel(initial.starts_at)} → {ubLabel(initial.ends_at)} (УБ цагаар)
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-ink-200 p-3.5">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span>
          <span className="block text-sm font-bold text-ink-900">
            Хямдрал идэвхжүүлэх
          </span>
          <span className="block text-xs text-ink-500">
            Унтраавал хямдарсан бараанууд шууд хэвийн үнэдээ орно
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-ink-700">Брэнд</div>
          <select
            value={form.brand_slug}
            onChange={(e) => set("brand_slug", e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
          >
            <option value="">— сонгох —</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-ink-700">
            Хямдралын хувь (%)
          </div>
          <input
            type="number"
            min={1}
            max={99}
            value={form.percent}
            onChange={(e) => set("percent", Number(e.target.value))}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-ink-700">
            Эхлэх (УБ цагаар)
          </div>
          <input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => set("starts_at", e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
          />
        </label>

        <label className="block">
          <div className="mb-1.5 text-xs font-bold text-ink-700">
            Дуусах (УБ цагаар)
          </div>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => set("ends_at", e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
          />
          <p className="mt-1 text-[11px] text-ink-500">
            Энэ мөчид хямдрал дуусна. Сүүлийн өдрийг бүтнээр нь хамруулах бол
            дараагийн өдрийн 00:00-г заана.
          </p>
        </label>
      </div>

      <label className="block">
        <div className="mb-1.5 text-xs font-bold text-ink-700">
          Кампанит ажлын нэр
        </div>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="жнь. VIDAN 10% хямдрал"
          className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
        />
      </label>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-700">
          ✓ {msg}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:bg-ink-300"
      >
        {pending ? "Хадгалж байна…" : "Хадгалах"}
      </button>

      <p className="text-[11px] leading-relaxed text-ink-500">
        Үнэ өгөгдлийн санд бодитоор солигдоно (хуучин үнэ нь зураастай
        харагдана). Хугацаа дуусмагц систем өөрөө хэвийн үнэд буцаана —
        гараар хийх шаардлагагүй. Захиалгын түүхэн дэх үнэ хөндөгдөхгүй.
      </p>
    </form>
  );
}
