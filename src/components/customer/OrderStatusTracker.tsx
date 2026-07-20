"use client";

/**
 * Захиалгын явцыг REAL-TIME харуулна.
 *  · Supabase Realtime-аар тухайн захиалгын мөрийг дагана.
 *  · Админ статус өөрчлөх (шинэ → бэлтгэж буй → жолоочид → хүргэгдсэн) буюу
 *    төлбөр баталгаажих үед хуудсаа сэргээхгүйгээр шинэчлэгдэнэ.
 *  · RLS "Orders: self read" тул зөвхөн эзэн нь өөрийн update-ийг авна.
 */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_FLOW, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

type Props = {
  orderId: string;
  initialStatus: OrderStatus;
  initialPaymentStatus: string;
  initialCancelledReason: string | null;
};

const STEP_HINT: Record<(typeof STATUS_FLOW)[number], string> = {
  new: "Захиалга хүлээн авлаа",
  preparing: "Бэлтгэж байна",
  shipping: "Жолооч хүргэж явна",
  delivered: "Амжилттай хүргэгдлээ",
};

export function OrderStatusTracker({
  orderId,
  initialStatus,
  initialPaymentStatus,
  initialCancelledReason,
}: Props) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [cancelledReason, setCancelledReason] = useState(initialCancelledReason);
  const [live, setLive] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function apply(row: {
      status: OrderStatus;
      payment_status: string;
      cancelled_reason: string | null;
    }) {
      if (cancelled) return;
      setStatus((prev) => {
        if (prev !== row.status) {
          setJustUpdated(true);
          setTimeout(() => setJustUpdated(false), 2000);
        }
        return row.status;
      });
      setPaymentStatus(row.payment_status);
      setCancelledReason(row.cancelled_reason);
    }

    // Fallback: 20 секунд тутам захиалгын төлвийг дахин уншина —
    // realtime ямар нэг шалтгаанаар ажиллахгүй байсан ч хэрэглэгч шинэчлэлт харна.
    async function poll() {
      const { data } = await supabase
        .from("orders")
        .select("status, payment_status, cancelled_reason")
        .eq("id", orderId)
        .maybeSingle();
      if (data) apply(data as Parameters<typeof apply>[0]);
    }
    const pollTimer = setInterval(poll, 20_000);

    // Realtime — RLS "Orders: self read" мөрдөгдөхийн тулд хэрэглэгчийн
    // JWT-г realtime холболтод тавина.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;
      channel = supabase
        .channel(`order-${orderId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${orderId}`,
          },
          (payload) => apply(payload.new as Parameters<typeof apply>[0]),
        )
        .subscribe((s) => setLive(s === "SUBSCRIBED"));
    })();

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    firstRender.current = false;
  }, []);

  const isCancelled = status === "cancelled";
  const currentStep = STATUS_FLOW.indexOf(
    status as (typeof STATUS_FLOW)[number],
  );

  if (isCancelled) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
        <div className="font-display text-lg font-bold text-brand-700">
          ✕ Энэ захиалга цуцлагдсан
        </div>
        {cancelledReason && (
          <p className="mt-1 text-xs text-ink-700">{cancelledReason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
          Захиалгын явц
        </h3>
        <span
          className={
            live
              ? "inline-flex items-center gap-1.5 text-[11px] font-bold text-[#2da764]"
              : "inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500"
          }
        >
          <span
            className={
              live
                ? "h-2 w-2 animate-pulse rounded-full bg-[#2da764]"
                : "h-2 w-2 rounded-full bg-ink-300"
            }
          />
          {live ? "Шууд дагаж байна" : "Холбогдож байна…"}
        </span>
      </div>

      {/* Төлбөрийн төлөв */}
      {paymentStatus !== "paid" && (
        <div className="mb-4 rounded-xl bg-warn-bg px-3.5 py-2.5 text-xs font-semibold text-warn">
          Төлбөр хүлээгдэж байна — төлөгдсөний дараа бэлтгэл эхэлнэ
        </div>
      )}

      <div
        className={
          justUpdated
            ? "grid grid-cols-4 gap-2 transition-opacity"
            : "grid grid-cols-4 gap-2"
        }
      >
        {STATUS_FLOW.map((s, idx) => {
          const done = idx <= currentStep;
          const isCurrent = idx === currentStep;
          return (
            <div key={s} className="text-center">
              <div
                className={
                  done
                    ? isCurrent
                      ? "mx-auto grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-base text-white shadow-[0_0_0_4px_var(--color-brand-100)]"
                      : "mx-auto grid h-10 w-10 place-items-center rounded-full bg-lime-500 text-base text-ink-900"
                    : "mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-base text-ink-500"
                }
              >
                {done && !isCurrent ? "✓" : idx + 1}
              </div>
              <div
                className={
                  done
                    ? "mt-1.5 text-[11px] font-bold text-ink-900"
                    : "mt-1.5 text-[11px] text-ink-500"
                }
              >
                {STATUS_LABEL[s]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Одоогийн алхмын тайлбар */}
      {currentStep >= 0 && (
        <div className="mt-4 rounded-xl bg-lime-50 px-4 py-3 text-center text-sm font-semibold text-lime-700">
          {STEP_HINT[STATUS_FLOW[currentStep]]}
        </div>
      )}
    </div>
  );
}
