"use client";

/**
 * Жимсний захиалгын төлөв — зөвхөн урагш: Бэлтгэж байна → Жолоочид →
 * Хүргэгдсэн. Цуцлах нь VIDAN-ы шийдвэр (төлбөр буцаалттай).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFruitOrderStatus } from "@/app/admin/fruit/actions";
import { nextStatus, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export function FruitOrderStatus({ orderId, status, paid }: { orderId: string; status: OrderStatus; paid: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const next = paid ? nextStatus(status) : null;

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <h3 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">Төлөв</h3>
      <div className="mb-3 text-sm">
        Одоо: <strong>{STATUS_LABEL[status]}</strong>
      </div>
      {next ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await updateFruitOrderStatus(orderId, next);
              if (!r.ok) setError(r.error);
              else router.refresh();
            })
          }
          className="w-full rounded-[10px] bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "…" : `→ ${STATUS_LABEL[next]}`}
        </button>
      ) : (
        <div className="text-xs text-ink-500">{paid ? "Эцсийн төлөв" : "Төлбөр хүлээгдэж байна"}</div>
      )}
      {error && <div className="mt-2 text-xs font-semibold text-brand-700">⚠️ {error}</div>}
    </div>
  );
}
