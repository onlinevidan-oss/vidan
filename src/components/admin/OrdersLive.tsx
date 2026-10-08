"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMnt } from "@/lib/utils";
import { becamePaid } from "@/lib/order-live";

/**
 * Админ хэсэг нээлттэй байх үед захиалгын өөрчлөлтийг шууд тусгана.
 *
 *  · Захиалга нэмэгдэх, төлөгдөх, төлөв солигдох бүрд хуудсын өгөгдлийг
 *    дахин татна (router.refresh) — жагсаалт, цэсний тоо, самбар шинэчлэгдэнэ.
 *    Клиентийн төлөв (бөглөж буй форм) хадгалагдана.
 *  · Захиалга ТӨЛӨГДӨХ мөчид баруун доод буланд мэдэгдэл гаргаж, дохио өгнө.
 *
 * RLS "Orders: staff read all" мөрдөгдөх тул ажилтны JWT-г realtime
 * холболтод тавина (хэрэглэгчийн OrderStatusTracker-тай ижил арга).
 * Realtime холбогдоогүй үед минут тутам шинэчилж нөөцөлнө.
 *
 * "Яг одоо төлөгдсөн" эсэхийг `becamePaid` шийднэ: төлбөр хүлээж буй
 * захиалгуудын id-г санаж байгаад, тэдгээрээс төлөгдсөнийг нь мэдэгдэнэ.
 */

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  payment_status: string;
};

type Toast = { id: string; number: string; total: number };

const TOAST_MS = 30_000;
const POLL_MS = 60_000;

/** Богино дохио. Браузер хэрэглэгч хуудсанд хүрээгүй бол дууг хориглодог —
 *  тэр үед чимээгүй өнгөрнө. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    // дуу гаргаж чадаагүй — мэдэгдэл дэлгэцэн дээр байгаа
  }
}

export function OrdersLive() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const liveRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const dismissTimers: ReturnType<typeof setTimeout>[] = [];
    // Төлбөр хүлээж буй захиалгууд — эхлээд сангаас, дараа нь үйл явдлаар
    const pending = new Set<string>();

    // Нэг захиалгад хэд хэдэн өөрчлөлт зэрэг ирдэг — нэг л удаа шинэчилнэ
    const refreshSoon = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 500);
    };

    const announce = (o: OrderRow) => {
      setToasts((list) =>
        list.some((t) => t.id === o.id)
          ? list
          : [...list, { id: o.id, number: o.order_number, total: Number(o.total) }],
      );
      beep();
      dismissTimers.push(
        setTimeout(
          () => setToasts((list) => list.filter((t) => t.id !== o.id)),
          TOAST_MS,
        ),
      );
    };

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      const { data: waiting } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_status", "pending");
      (waiting ?? []).forEach((o) => pending.add(o.id));
      if (cancelled) return;

      channel = supabase
        .channel("admin-orders")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            refreshSoon();
            if (payload.eventType === "DELETE") return;
            const now = payload.new as OrderRow;
            const old =
              payload.eventType === "UPDATE"
                ? (payload.old as Partial<OrderRow>)
                : null;
            if (becamePaid(now, old, pending.has(now.id))) announce(now);
            if (now.payment_status === "pending") pending.add(now.id);
            else pending.delete(now.id);
          },
        )
        .subscribe((status) => {
          liveRef.current = status === "SUBSCRIBED";
        });
    })();

    const poll = setInterval(() => {
      if (!liveRef.current && document.visibilityState === "visible") {
        router.refresh();
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(refreshTimer);
      clearInterval(poll);
      dismissTimers.forEach(clearTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[300px] max-w-[calc(100vw-2rem)] flex-col gap-2 print:hidden">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-start gap-3 rounded-2xl border-[1.5px] border-lime-600 bg-white p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
        >
          <div className="text-2xl leading-none">🛎</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-lime-700">
              Шинэ захиалга төлөгдлөө
            </div>
            <div className="font-display text-[15px] font-extrabold text-ink-900">
              {t.number} · {formatMnt(t.total)}
            </div>
            <Link
              href={`/admin/orders/${t.id}`}
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
              className="mt-1 inline-block text-xs font-bold text-brand-700 hover:text-brand-900"
            >
              Захиалгыг нээх →
            </Link>
          </div>
          <button
            type="button"
            aria-label="Хаах"
            onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs text-ink-500 transition hover:bg-ink-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
