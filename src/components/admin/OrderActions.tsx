"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, markAsPaid } from "@/app/admin/(protected)/orders/[orderId]/actions";

export function OrderActions({
  orderId,
  currentStatus,
  paymentStatus,
  nextLabel,
  nextStatus,
}: {
  orderId: string;
  currentStatus: string;
  paymentStatus: string;
  nextLabel: string | null;
  nextStatus: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");

  const isFinal = currentStatus === "delivered" || currentStatus === "cancelled";

  function advance() {
    if (!nextStatus) return;
    startTransition(async () => {
      await updateOrderStatus(orderId, nextStatus as never);
      router.refresh();
    });
  }

  function cancel() {
    startTransition(async () => {
      await updateOrderStatus(orderId, "cancelled", reason || undefined);
      router.refresh();
      setShowCancel(false);
    });
  }

  function pay() {
    startTransition(async () => {
      await markAsPaid(orderId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <h3 className="font-display mb-4 text-sm font-extrabold uppercase tracking-wider text-ink-700">
        Үйлдэл
      </h3>

      <div className="space-y-2">
        {paymentStatus !== "paid" && (
          <button
            onClick={pay}
            disabled={pending}
            className="w-full rounded-[10px] bg-lime-600 px-4 py-3 font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-50"
          >
            💰 Төлбөр баталгаажуулах
          </button>
        )}

        {nextLabel && nextStatus && !isFinal && (
          <button
            onClick={advance}
            disabled={pending}
            className="w-full rounded-[10px] bg-brand-600 px-4 py-3 font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            → {nextLabel}
          </button>
        )}

        {!isFinal && !showCancel && (
          <button
            onClick={() => setShowCancel(true)}
            className="w-full rounded-[10px] border-[1.5px] border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
          >
            ✕ Цуцлах
          </button>
        )}

        {showCancel && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
            <label className="block text-xs font-bold text-ink-700">
              Цуцлах шалтгаан
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-ink-200 bg-white p-2 text-sm outline-none focus:border-brand-500"
              rows={2}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={cancel}
                disabled={pending}
                className="flex-1 rounded-md bg-brand-600 px-3 py-2 text-xs font-bold text-white"
              >
                Цуцлах
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-bold text-ink-700"
              >
                Болих
              </button>
            </div>
          </div>
        )}

        {isFinal && (
          <div className="rounded-lg bg-cream p-3 text-center text-xs text-ink-500">
            Эцсийн төлөвт орсон
          </div>
        )}
      </div>
    </div>
  );
}
