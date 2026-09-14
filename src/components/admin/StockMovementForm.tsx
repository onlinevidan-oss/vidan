"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordStockMovement,
  type StockMovementKind,
} from "@/app/admin/(protected)/inventory/actions";

/**
 * Мөр дээрх "Хөдөлгөөн" товч — дарахад жижиг маягт нээгдэнэ.
 *
 * Тоог шууд засварлуулахгүй, зөвхөн ХӨДӨЛГӨӨН бүртгэнэ: агуулахын
 * үлдэгдэл нь орлого/зарлагын нийлбэрээр л өөрчлөгдөх ёстой, эс тэгвэл
 * stock_movements-ийн тэнцэл products.stock-оос салж, тайлан зөрнө.
 *
 * Гурван төрөл:
 *   Орлого — бараа ирсэн (+)
 *   Зарлага — гэмтсэн, дотоод хэрэглээ, хаягдал (−).
 *             Борлуулалтын зарлагыг захиалга өөрөө бүртгэдэг.
 *   Засвар — тооллогын зөрүү (+/− аль аль нь)
 */
const KINDS: {
  value: StockMovementKind;
  label: string;
  hint: string;
  signed: boolean;
}[] = [
  { value: "in", label: "Орлого", hint: "Бараа ирсэн", signed: false },
  { value: "out", label: "Зарлага", hint: "Гэмтэл, дотоод хэрэглээ", signed: false },
  { value: "adjust", label: "Засвар", hint: "Тооллогын зөрүү (+/−)", signed: true },
];

export function StockMovementForm({
  productId,
  productName,
  currentStock,
  today,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  /** УБ өдөр "YYYY-MM-DD" — сервер талаас, клиентийн цагт найдахгүй */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<StockMovementKind>("in");
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active = KINDS.find((k) => k.value === kind)!;
  const n = Number(qty);
  // Хадгалахаас өмнө шинэ үлдэгдлийг урьдчилан харуулна
  const preview =
    qty.trim() !== "" && Number.isFinite(n) && n !== 0
      ? currentStock +
        (kind === "in" ? Math.abs(n) : kind === "out" ? -Math.abs(n) : n)
      : null;

  function submit() {
    setError(null);
    if (!Number.isFinite(n) || n === 0) {
      setError("Тоо ширхэгээ оруулна уу");
      return;
    }
    if (preview !== null && preview < 0) {
      setError("Үлдэгдэл сөрөг болно");
      return;
    }
    startTransition(async () => {
      const res = await recordStockMovement({ productId, kind, quantity: n, date, note });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(res.newStock);
      setQty("");
      setNote("");
      router.refresh();
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 1800);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${productName} — орлого / зарлага бүртгэх`}
        className="print-hide whitespace-nowrap rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-lime-600 hover:bg-lime-50 hover:text-lime-700"
      >
        ± Хөдөлгөөн
      </button>
    );
  }

  return (
    <div className="print-hide flex w-[240px] flex-col gap-1.5 rounded-[10px] border-[1.5px] border-lime-600 bg-lime-50 p-2">
      {done !== null ? (
        <div className="text-[11px] font-bold text-lime-700">
          ✓ Бүртгэгдлээ · шинэ үлдэгдэл {done}
        </div>
      ) : (
        <>
          {/* Төрөл сонгох */}
          <div className="grid grid-cols-3 gap-1">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                title={k.hint}
                className={
                  kind === k.value
                    ? "rounded-[7px] bg-ink-900 px-1 py-1 text-[10px] font-bold text-white"
                    : "rounded-[7px] border-[1.5px] border-ink-200 bg-white px-1 py-1 text-[10px] font-bold text-ink-500 transition hover:border-ink-400"
                }
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="text-[10px] leading-tight text-ink-500">{active.hint}</div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={active.signed ? "+/− тоо" : "тоо"}
              autoFocus
              className="w-[72px] rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2 py-1 text-[12px] tabular-nums outline-none focus:border-lime-600"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-w-0 flex-1 rounded-[8px] border-[1.5px] border-ink-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-lime-600"
            />
          </div>

          {preview !== null && (
            <div
              className={
                preview < 0
                  ? "text-[11px] font-bold text-brand-600"
                  : "text-[11px] font-semibold text-ink-700"
              }
            >
              {currentStock} → <strong>{preview}</strong> ширхэг
            </div>
          )}

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="тайлбар (заавал биш)"
            className="rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-lime-600"
          />
          {error && (
            <div className="text-[11px] font-semibold text-brand-600">{error}</div>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="flex-1 rounded-[8px] bg-lime-600 px-2 py-1 text-[11px] font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-50"
            >
              {pending ? "..." : "Хадгалах"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2 py-1 text-[11px] font-bold text-ink-500"
            >
              Болих
            </button>
          </div>
        </>
      )}
    </div>
  );
}
