"use client";

/**
 * Промо кодын удирдлага — жагсаалт, үүсгэх, засах, асаах/унтраах, устгах.
 *
 * Хөнгөлөлтийг энд БОДОХГҮЙ: захиалга дээр `validate_promo` (сервер) бодно.
 * Энд зөвхөн кодын нөхцөлийг тохируулна.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPromo,
  deletePromo,
  setPromoActive,
  updatePromo,
} from "@/app/admin/(protected)/promotions/actions";
import {
  PROMO_SEGMENTS,
  PROMO_SEGMENT_LABEL,
  PROMO_STATE_LABEL,
  normalizePromoCode,
  validatePromo,
  type PromoInput,
  type PromoSegment,
  type PromoState,
  type PromoType,
} from "@/lib/promo";
import { formatMnt } from "@/lib/utils";

export type PromoRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  min_order: number;
  max_discount: number | null;
  segment: string;
  /** УБ өдөр "YYYY-MM-DD" — серверээс бэлэн ирнэ */
  starts_on: string;
  ends_on: string;
  usage_limit: number | null;
  usage_per_user: number | null;
  usage_count: number;
  is_active: boolean;
  state: PromoState;
  /** Энэ кодоор нийт өгсөн хөнгөлөлт (₮) */
  discount_given: number;
};

const STATE_STYLE: Record<PromoState, string> = {
  active: "bg-lime-100 text-lime-700",
  off: "bg-ink-100 text-ink-500",
  scheduled: "bg-[#e8f1fc] text-[#2e7eda]",
  expired: "bg-ink-100 text-ink-500",
  used_up: "bg-ink-100 text-ink-500",
  unsupported: "bg-brand-100 text-brand-700",
};

function blank(today: string): PromoInput {
  return {
    code: "",
    name: "",
    type: "percent",
    value: 10,
    min_order: 20000,
    max_discount: null,
    segment: "all",
    starts_on: today,
    ends_on: "",
    usage_limit: null,
    usage_per_user: 1,
    is_active: true,
  };
}

function toInput(p: PromoRow): PromoInput {
  return {
    code: p.code,
    name: p.name,
    type: p.type === "fixed" ? "fixed" : "percent",
    value: p.value,
    min_order: p.min_order,
    max_discount: p.max_discount,
    segment: (PROMO_SEGMENTS as readonly string[]).includes(p.segment)
      ? (p.segment as PromoSegment)
      : "all",
    starts_on: p.starts_on,
    ends_on: p.ends_on,
    usage_limit: p.usage_limit,
    usage_per_user: p.usage_per_user,
    is_active: p.is_active,
  };
}

function discountText(p: PromoRow): string {
  if (p.type === "percent") {
    return `${p.value}%${p.max_discount ? ` (дээд тал нь ${formatMnt(p.max_discount)})` : ""}`;
  }
  if (p.type === "fixed") return formatMnt(p.value);
  return p.type === "bogo" ? "1+1" : "Үнэгүй хүргэлт";
}

export function PromoManager({ promos, today }: { promos: PromoRow[]; today: string }) {
  const router = useRouter();
  // null — хаалттай; "new" — шинэ; бусад — засаж буй мөрийн id
  const [editing, setEditing] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(id: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setRowError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setRowError({ id, text: res.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <PromoForm
          title="Шинэ промо код"
          initial={blank(today)}
          onCancel={() => setEditing(null)}
          onSave={(v) => createPromo(v)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:bg-brand-700"
        >
          ＋ Шинэ промо код
        </button>
      )}

      <div className="rounded-2xl border border-ink-200 bg-white">
        {promos.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <div className="mb-3 text-4xl opacity-40">🎁</div>
            <div className="font-display text-base font-bold text-ink-700">
              Промо код үүсгээгүй байна
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {promos.map((p) =>
              editing === p.id ? (
                <li key={p.id} className="p-4">
                  <PromoForm
                    title={`${p.code} — засах`}
                    initial={toInput(p)}
                    lockCode={p.usage_count > 0}
                    onCancel={() => setEditing(null)}
                    onSave={(v) => updatePromo(p.id, v)}
                    onDone={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                </li>
              ) : (
                <li key={p.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="rounded-lg bg-ink-900 px-2.5 py-1 font-mono text-[13px] font-bold tracking-wider text-white">
                      {p.code}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_STYLE[p.state]}`}>
                      {PROMO_STATE_LABEL[p.state]}
                    </span>
                    <span className="font-bold text-ink-900">{p.name}</span>
                    <span className="ml-auto font-display text-[15px] font-extrabold text-brand-700">
                      −{discountText(p)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
                    <span>
                      Доод дүн: <strong className="text-ink-700">{formatMnt(p.min_order)}</strong>
                    </span>
                    <span>
                      Хэнд:{" "}
                      <strong className="text-ink-700">
                        {PROMO_SEGMENT_LABEL[p.segment as PromoSegment] ?? p.segment}
                      </strong>
                    </span>
                    <span>
                      Хугацаа:{" "}
                      <strong className="text-ink-700">
                        {p.starts_on} → {p.ends_on || "хугацаагүй"}
                      </strong>
                    </span>
                    <span>
                      Ашигласан:{" "}
                      <strong className="text-ink-700">
                        {p.usage_count}
                        {p.usage_limit !== null ? ` / ${p.usage_limit}` : ""}
                      </strong>
                    </span>
                    {p.discount_given > 0 && (
                      <span>
                        Өгсөн хөнгөлөлт:{" "}
                        <strong className="text-ink-700">{formatMnt(p.discount_given)}</strong>
                      </span>
                    )}
                  </div>

                  {p.state === "unsupported" && (
                    <div className="mt-2 text-xs font-semibold text-brand-700">
                      Энэ төрлийн урамшуулал (1+1, үнэгүй хүргэлт) одоогоор
                      тооцогддоггүй — код оруулсан ч хөнгөлөлт өгөхгүй.
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(p.id, () => setPromoActive(p.id, !p.is_active))}
                      className={
                        p.is_active
                          ? "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
                          : "rounded-[8px] bg-lime-600 px-3 py-1.5 text-[11px] font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-50"
                      }
                    >
                      {p.is_active ? "Унтраах" : "Асаах"}
                    </button>
                    {p.state !== "unsupported" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRowError(null);
                          setEditing(p.id);
                        }}
                        className="rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
                      >
                        Засах
                      </button>
                    )}
                    {p.usage_count === 0 && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`${p.code} кодыг устгах уу?`)) return;
                          run(p.id, () => deletePromo(p.id));
                        }}
                        className="rounded-[8px] border-[1.5px] border-brand-200 bg-white px-3 py-1.5 text-[11px] font-bold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
                      >
                        Устгах
                      </button>
                    )}
                    {rowError?.id === p.id && (
                      <span className="text-[11px] font-semibold text-brand-600">
                        ⚠️ {rowError.text}
                      </span>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500";

/** Хоосон бол null, эс бөгөөс бүхэл тоо */
function intOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  return Math.trunc(Number(v));
}

function PromoForm({
  title,
  initial,
  lockCode = false,
  onSave,
  onDone,
  onCancel,
}: {
  title: string;
  initial: PromoInput;
  /** Ашиглагдсан кодын нэрийг солихгүй — хэрэглэгчид тараагдсан байж болно */
  lockCode?: boolean;
  onSave: (v: PromoInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<PromoInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof PromoInput>(k: K, value: PromoInput[K]) {
    setV((prev) => ({ ...prev, [k]: value }));
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validatePromo(v);
    if (invalid) return setError(invalid);
    startTransition(async () => {
      const res = await onSave(v);
      if (!res.ok) return setError(res.error);
      onDone();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border-[1.5px] border-brand-200 bg-white p-5"
    >
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
        <Field label="Код" hint="Латин үсэг, тоо — хэрэглэгч захиалга дээрээ бичнэ">
          <input
            type="text"
            value={v.code}
            disabled={lockCode}
            onChange={(e) => set("code", normalizePromoCode(e.target.value))}
            placeholder="NAMAR10"
            maxLength={20}
            className={`${INPUT} font-mono font-bold tracking-wider disabled:bg-ink-100 disabled:text-ink-500`}
          />
        </Field>
        <Field label="Нэр" hint="Дотоод хэрэгцээнд — хэрэглэгчид харагдахгүй">
          <input
            type="text"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Намрын урамшуулал"
            className={INPUT}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Төрөл">
          <select
            value={v.type}
            onChange={(e) => set("type", e.target.value as PromoType)}
            className={INPUT}
          >
            <option value="percent">Хувиар (%)</option>
            <option value="fixed">Тогтмол дүн (₮)</option>
          </select>
        </Field>
        <Field label={v.type === "percent" ? "Хувь (%)" : "Хөнгөлөх дүн (₮)"}>
          <input
            type="number"
            min={1}
            value={Number.isFinite(v.value) ? v.value : ""}
            onChange={(e) => set("value", Math.trunc(Number(e.target.value)))}
            className={INPUT}
          />
        </Field>
        <Field label="Захиалгын доод дүн (₮)" hint="Барааны дүн үүнээс бага бол код ажиллахгүй">
          <input
            type="number"
            min={0}
            value={Number.isFinite(v.min_order) ? v.min_order : ""}
            onChange={(e) => set("min_order", Math.trunc(Number(e.target.value)))}
            className={INPUT}
          />
        </Field>
        {v.type === "percent" && (
          <Field label="Хөнгөлөлтийн дээд хязгаар (₮)" hint="Хоосон бол хязгааргүй">
            <input
              type="number"
              min={1}
              value={v.max_discount ?? ""}
              onChange={(e) => set("max_discount", intOrNull(e.target.value))}
              className={INPUT}
            />
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Эхлэх өдөр">
          <input
            type="date"
            value={v.starts_on}
            onChange={(e) => set("starts_on", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Дуусах өдөр" hint="Хоосон бол хугацаагүй">
          <input
            type="date"
            value={v.ends_on}
            onChange={(e) => set("ends_on", e.target.value)}
            className={INPUT}
          />
        </Field>
        <Field label="Нийт ашиглах тоо" hint="Хоосон бол хязгааргүй">
          <input
            type="number"
            min={1}
            value={v.usage_limit ?? ""}
            onChange={(e) => set("usage_limit", intOrNull(e.target.value))}
            className={INPUT}
          />
        </Field>
        <Field label="Нэг хүн хэдэн удаа" hint="Хоосон бол хязгааргүй">
          <input
            type="number"
            min={1}
            value={v.usage_per_user ?? ""}
            onChange={(e) => set("usage_per_user", intOrNull(e.target.value))}
            className={INPUT}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
        <Field label="Хэнд үйлчлэх">
          <select
            value={v.segment}
            onChange={(e) => set("segment", e.target.value as PromoSegment)}
            className={INPUT}
          >
            {PROMO_SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {PROMO_SEGMENT_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 self-end pb-2 text-sm font-bold text-ink-900">
          <input
            type="checkbox"
            checked={v.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          Идэвхтэй — хадгалмагц хэрэглэгчид ашиглаж эхэлнэ
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:border-ink-400"
        >
          Болих
        </button>
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
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-ink-500">{hint}</div>}
    </label>
  );
}
