"use client";

/**
 * Эрхийн бичгийн удирдлага (0050) — жагсаалт, үлдэгдэл, үүсгэх, асаах/унтраах.
 *
 * Хасалтыг энд БОДОХГҮЙ: захиалга дээр place_order (сервер) үлдэгдлээс
 * хасна. Дүн, кодыг үүсгэсний дараа засахгүй — буруу бол унтраагаад
 * шинээр үүсгэнэ.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVoucher, setVoucherActive } from "@/app/admin/(protected)/promotions/actions";
import {
  VOUCHER_STATE_LABEL,
  normalizeVoucherCode,
  validateVoucher,
  type VoucherInput,
  type VoucherState,
} from "@/lib/gift-voucher";
import { formatMnt } from "@/lib/utils";

export type VoucherRow = {
  id: string;
  code: string;
  amount: number;
  balance: number;
  /** УБ өдөр "YYYY-MM-DD", "" = хугацаагүй */
  ends_on: string;
  is_active: boolean;
  state: VoucherState;
  note: string | null;
  /** Анх ашигласан хэрэглэгч (холбогдоогүй бол null) */
  owner: { id: string; name: string | null; phone: string | null } | null;
  uses: {
    order_id: string;
    order_number: string;
    amount: number;
    cancelled: boolean;
    /** "2026.11.09" */
    date: string;
  }[];
};

const STATE_STYLE: Record<VoucherState, string> = {
  active: "bg-lime-100 text-lime-700",
  off: "bg-ink-100 text-ink-500",
  expired: "bg-ink-100 text-ink-500",
  empty: "bg-ink-100 text-ink-500",
};

const INPUT =
  "w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500";

export function VoucherManager({ vouchers, today }: { vouchers: VoucherRow[]; today: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string, active: boolean) {
    setRowError(null);
    startTransition(async () => {
      const res = await setVoucherActive(id, active);
      if (!res.ok) return setRowError({ id, text: res.error });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <VoucherForm
          today={today}
          onCancel={() => setCreating(false)}
          onDone={(code) => {
            setCreating(false);
            setCreated(code);
            router.refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreated(null);
            setCreating(true);
          }}
          className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:bg-brand-700"
        >
          ＋ Шинэ эрхийн бичиг
        </button>
      )}

      {created && (
        <div className="rounded-xl border-[1.5px] border-lime-300 bg-lime-50 px-4 py-3 text-sm text-ink-900">
          Эрхийн бичиг үүслээ:{" "}
          <strong className="font-mono text-base tracking-wider">{created}</strong> — энэ
          кодыг зөвхөн эзэнд нь өгнө. Анх ашигласан хүнд холбогдоно.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {vouchers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mb-3 text-4xl opacity-40">🎫</div>
            <div className="font-display text-base font-bold text-ink-700">
              Эрхийн бичиг үүсгээгүй байна
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {vouchers.map((v) => (
              <li key={v.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="rounded-lg bg-ink-900 px-2.5 py-1 font-mono text-[13px] font-bold tracking-wider text-white">
                    {v.code}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_STYLE[v.state]}`}>
                    {VOUCHER_STATE_LABEL[v.state]}
                  </span>
                  {v.note && <span className="font-bold text-ink-900">{v.note}</span>}
                  <span className="ml-auto text-right">
                    <span className="font-display text-[15px] font-extrabold text-brand-700">
                      {formatMnt(v.balance)}
                    </span>
                    <span className="text-xs text-ink-500"> / {formatMnt(v.amount)} үлдсэн</span>
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
                  <span>
                    Хугацаа:{" "}
                    <strong className="text-ink-700">{v.ends_on || "хугацаагүй"}</strong>
                  </span>
                  <span>
                    Эзэмшигч:{" "}
                    {v.owner ? (
                      <Link
                        href={`/admin/customers/${v.owner.id}`}
                        className="font-bold text-ink-700 hover:text-brand-700 hover:underline"
                      >
                        {[v.owner.name, v.owner.phone].filter(Boolean).join(" · ") || "хэрэглэгч"}
                      </Link>
                    ) : (
                      <strong className="text-ink-700">ашиглаагүй байна</strong>
                    )}
                  </span>
                  <span>
                    Ашигласан:{" "}
                    <strong className="text-ink-700">{formatMnt(v.amount - v.balance)}</strong>
                  </span>
                </div>

                {v.uses.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {v.uses.map((u) => (
                      <li key={u.order_id} className="flex flex-wrap gap-x-3 text-ink-500">
                        <Link
                          href={`/admin/orders/${u.order_id}`}
                          className="font-bold text-ink-700 hover:text-brand-700 hover:underline"
                        >
                          {u.order_number}
                        </Link>
                        <span>{u.date}</span>
                        <span className={u.cancelled ? "line-through" : "font-semibold text-ink-900"}>
                          −{formatMnt(u.amount)}
                        </span>
                        {u.cancelled && <span>цуцлагдсан — үлдэгдэлд буцсан</span>}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(v.id, !v.is_active)}
                    className={
                      v.is_active
                        ? "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
                        : "rounded-[8px] bg-lime-600 px-3 py-1.5 text-[11px] font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-50"
                    }
                  >
                    {v.is_active ? "Унтраах" : "Асаах"}
                  </button>
                  {rowError?.id === v.id && (
                    <span className="text-[11px] font-semibold text-brand-600">⚠️ {rowError.text}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VoucherForm({
  today,
  onDone,
  onCancel,
}: {
  today: string;
  onDone: (code: string) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<VoucherInput>({ code: "", amount: 0, ends_on: "", note: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof VoucherInput>(k: K, value: VoucherInput[K]) {
    setV((prev) => ({ ...prev, [k]: value }));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateVoucher(v, today);
    if (invalid) return setError(invalid);
    startTransition(async () => {
      const res = await createVoucher(v);
      if (!res.ok) return setError(res.error);
      onDone(res.code);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border-[1.5px] border-brand-200 bg-white p-5">
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
        Шинэ эрхийн бичиг
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink-700">Дүн (₮)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            step={1000}
            value={v.amount || ""}
            onChange={(e) => set("amount", Math.trunc(Number(e.target.value)))}
            placeholder="200000"
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink-700">Хүчинтэй хугацаа (энэ өдрийг дуустал)</span>
          <input
            type="date"
            value={v.ends_on}
            min={today}
            onChange={(e) => set("ends_on", e.target.value)}
            className={INPUT}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-ink-700">Код (заавал биш)</span>
          <input
            type="text"
            value={v.code}
            onChange={(e) => set("code", normalizeVoucherCode(e.target.value))}
            placeholder="Хоосон бол автоматаар"
            maxLength={20}
            className={`${INPUT} font-mono font-bold tracking-wider`}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-ink-700">Тэмдэглэл — хэнд, юуны төлөө</span>
        <input
          type="text"
          value={v.note}
          onChange={(e) => set("note", e.target.value)}
          maxLength={200}
          placeholder="Жнь: хэнд, ямар шалтгаанаар өгсөн"
          className={INPUT}
        />
      </label>
      <p className="text-[11px] text-ink-500">
        Хэрэглэгч захиалга дээрээ промо кодын талбарт бичнэ. Хүргэлтийн төлбөр орно, хэд
        хуваан ашиглаж болно. Анх ашигласан хүнд холбогдоно. Картын 5% хамт хасагдахгүй.
      </p>
      {error && <p className="text-sm font-semibold text-brand-700">⚠️ {error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-brand-600 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Үүсгэж байна…" : "Үүсгэх"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-[13px] font-bold text-ink-700"
        >
          Болих
        </button>
      </div>
    </form>
  );
}
