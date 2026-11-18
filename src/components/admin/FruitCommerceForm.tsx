"use client";

/**
 * Жимсний худалдааны тохиргоо: жимсний доод дүн ба 2 дахь хайрцгаас
 * эхлэн хайрцаг бүрт нэмэгдэх хүргэлт (НӨАТ-гүй оруулна, НӨАТ 10%
 * дээр нь нэмэгдэнэ — 0054).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFruitCommerce } from "@/app/admin/fruit/actions";
import { formatMnt } from "@/lib/utils";
import { shippingVat } from "@/lib/pricing";

export function FruitCommerceForm({
  minOrder,
  boxFee,
  baseFee,
}: {
  minOrder: number;
  boxFee: number;
  /** Энгийн хүргэлт (НӨАТ-гүй) — жишээнд */
  baseFee: number;
}) {
  const router = useRouter();
  const [min, setMin] = useState(String(minOrder));
  const [fee, setFee] = useState(String(boxFee));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const feeNum = Math.max(0, Math.round(Number(fee) || 0));
  const gross = (n: number) => n + shippingVat(n);
  const dirty = Number(min) !== minOrder || Number(fee) !== boxFee;

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const r = await saveFruitCommerce({
        fruit_min_order_amount: Number(min),
        fruit_box_extra_fee: Number(fee),
      });
      if (!r.ok) return setError(r.error);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="font-bold text-ink-900">Захиалга ба хүргэлт</div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-xs font-bold text-ink-700">Жимсний захиалгын доод дүн (₮)</div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
          <div className="mt-1 text-[11px] text-ink-500">Сагсан дахь жимсний дүн дангаараа хүрэх ёстой.</div>
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-bold text-ink-700">Нэмэлт хайрцаг бүрт хүргэлт (₮, НӨАТ-гүй)</div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
          />
          <div className="mt-1 text-[11px] text-ink-500">
            НӨАТ-тай нь: +{formatMnt(gross(feeNum))} — 2 дахь хайрцгаас эхэлнэ.
          </div>
        </label>
      </div>

      <div className="mt-3 rounded-xl bg-cream-100 p-3 text-xs text-ink-700">
        <div className="mb-1 font-bold">Жишээ (НӨАТ-тай хүргэлт):</div>
        {[1, 2, 3, 4].map((n) => (
          <div key={n}>
            {n} хайрцаг → <b>{formatMnt(gross(baseFee + (n - 1) * feeNum))}</b>
          </div>
        ))}
        <div className="mt-1 text-ink-500">1кг, 1.5кг савлагаа энгийн бараа шиг ширхгээр тоологдоно.</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-[10px] bg-ink-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-ink-700 disabled:opacity-40"
        >
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {saved && <span className="text-sm font-bold text-lime-700">✓ Хадгалагдлаа</span>}
        {error && <span className="text-sm font-semibold text-brand-600">{error}</span>}
      </div>
    </div>
  );
}
