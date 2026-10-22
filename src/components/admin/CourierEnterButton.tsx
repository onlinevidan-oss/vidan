"use client";

/**
 * "Шивсэн" — захиалгыг гадны хүргэлтийн компанид оруулсныг тэмдэглэнэ.
 * Дарахад эзэнд SMS явна ("Номин-Эрдэнэ #10323 захиалгыг шивлээ"), тиймээс
 * санамсаргүй дарахаас сэргийлж нэг удаа баталгаажуулна. Шивсний дараа
 * товчны оронд хэн, хэзээ шивсэн нь харагдана.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markCourierEntered } from "@/app/admin/(protected)/orders/[orderId]/actions";

/**
 * "10.22 15:21" (УБ цаг). Intl-ийн mn-MN-д найдахгүй — зарим браузер
 * дэмждэггүй тул "10/22, 03:21 PM" гэж англиар гаргаж байв.
 */
function hhmm(iso: string): string {
  const d = new Date(Date.parse(iso) + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function CourierEnterButton({
  orderId,
  orderNumber,
  enteredAt,
  enteredBy,
}: {
  orderId: string;
  orderNumber: string;
  enteredAt: string | null;
  enteredBy: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState({ at: enteredAt, by: enteredBy });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state.at) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-bold text-lime-700"
        title="Хүргэлтийн компанид шивсэн"
      >
        ✓ Шивсэн · {state.by ?? "—"} · {hhmm(state.at)}
      </span>
    );
  }

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`${orderNumber} захиалгыг хүргэлтийн компанид шивсэн үү?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await markCourierEntered(orderId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setState({ at: res.enteredAt, by: res.enteredBy });
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-[8px] border-[1.5px] border-brand-600 bg-white px-3 py-1 text-[12px] font-extrabold text-brand-700 transition hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Тэмдэглэж байна…" : "Шивсэн"}
      </button>
      {error && <span className="text-[11px] font-semibold text-brand-700">⚠️ {error}</span>}
    </span>
  );
}
