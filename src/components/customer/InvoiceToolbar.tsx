"use client";

/**
 * Нэхэмжлэлийн хуудасны дээд мөр (хэвлэхэд харагдахгүй):
 * төлөв, 24 цагийн анхааруулга, хэвлэх товч, QPay холбоос.
 * Захиалагч өөрөө нээсэн бол QPay-ийн төлбөрийг үе үе шалгаж,
 * төлөгдмөгц хуудсыг шинэчилнэ (QR-ээр төлсөн тохиолдол).
 */
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkPaymentStatus } from "@/app/(customer)/checkout/payment/[orderId]/actions";

const POLL_MS = 8_000;

export function InvoiceToolbar({
  orderId,
  state,
  due,
  backHref,
  poll,
  qpayUrl,
}: {
  orderId: string;
  state: "unconfirmed" | "paid" | "cancelled";
  due: string;
  backHref: string;
  poll: boolean;
  qpayUrl: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!poll) return;
    let stopped = false;
    const id = setInterval(async () => {
      if (document.hidden) return;
      const res = await checkPaymentStatus(orderId);
      if (!stopped && res.ok && res.status === "paid") {
        stopped = true;
        clearInterval(id);
        router.refresh();
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [poll, orderId, router]);

  return (
    <div className="mx-auto mb-4 w-full max-w-[800px] space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={backHref}
          className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
        >
          ← Захиалга руу
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto rounded-[10px] bg-ink-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-ink-700"
        >
          🖨 Хэвлэх / PDF хадгалах
        </button>
      </div>

      {state === "unconfirmed" && (
        <div className="rounded-xl border-[1.5px] border-brand-300 bg-brand-50 p-4 text-sm text-ink-900">
          <div className="font-bold text-brand-700">⏳ Төлбөр баталгаажаагүй байна</div>
          <p className="mt-1">
            Захиалга шивсний дараа та 24 цагийн дотор төлбөрөө баталгаажуулна уу.
            Баталгаажуулаагүй тохиолдолд захиалга цуцлагдахыг анхаарна уу.
          </p>
          <p className="mt-1 text-[13px]">
            Төлөх эцсийн хугацаа: <strong>{due}</strong>
          </p>
          {qpayUrl && (
            <a
              href={qpayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              📱 Банкны апп-аар (QPay) төлөх
            </a>
          )}
        </div>
      )}
      {state === "paid" && (
        <div className="rounded-xl border-[1.5px] border-lime-300 bg-lime-50 p-4 text-sm font-bold text-ink-900">
          ✓ Төлбөр баталгаажсан. Захиалга хүргэлтэд бэлтгэгдэж байна.
        </div>
      )}
      {state === "cancelled" && (
        <div className="rounded-xl border-[1.5px] border-ink-200 bg-white p-4 text-sm font-bold text-ink-700">
          Энэ захиалга цуцлагдсан тул нэхэмжлэл хүчингүй.
        </div>
      )}
    </div>
  );
}
