"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordStockIn } from "@/app/admin/(protected)/inventory/actions";

/**
 * Мөр дээрх "Орлого" товч — дарахад жижиг маягт нээгдэнэ.
 *
 * Тоог шууд засварлуулахгүй, зөвхөн НЭМЭХ утга авна: агуулахын үлдэгдэл
 * хөдөлгөөнөөр л өөрчлөгдөх ёстой (орлого +, зарлага −), эс тэгвэл
 * stock_movements-ийн тэнцэл products.stock-оос сална.
 */
export function StockInForm({
  productId,
  productName,
  today,
}: {
  productId: string;
  productName: string;
  /** УБ өдөр "YYYY-MM-DD" — сервер талаас, клиентийн цагт найдахгүй */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    const n = Number(qty);
    if (!Number.isFinite(n) || n === 0) {
      setError("Тоо ширхэгээ оруулна уу");
      return;
    }
    startTransition(async () => {
      const res = await recordStockIn({
        productId,
        quantity: n,
        date,
        note,
      });
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
      }, 1600);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`${productName} — орлого нэмэх`}
        className="print-hide whitespace-nowrap rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-700 transition hover:border-lime-600 hover:bg-lime-50 hover:text-lime-700"
      >
        + Орлого
      </button>
    );
  }

  return (
    <div className="print-hide flex flex-col gap-1.5 rounded-[10px] border-[1.5px] border-lime-600 bg-lime-50 p-2">
      {done !== null ? (
        <div className="text-[11px] font-bold text-lime-700">
          ✓ Бүртгэгдлээ · шинэ үлдэгдэл {done}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="тоо"
              autoFocus
              className="w-[68px] rounded-[8px] border-[1.5px] border-ink-200 bg-white px-2 py-1 text-[12px] tabular-nums outline-none focus:border-lime-600"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[8px] border-[1.5px] border-ink-200 bg-white px-1.5 py-1 text-[11px] outline-none focus:border-lime-600"
            />
          </div>
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
