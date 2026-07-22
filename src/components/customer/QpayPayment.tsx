"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMnt } from "@/lib/utils";
import { checkPaymentStatus } from "@/app/(customer)/checkout/payment/[orderId]/actions";
import type { QpayBankUrl } from "@/lib/qpay/orders";

const POLL_INTERVAL_MS = 3000;

export function QpayPayment({
  orderId,
  orderNumber,
  total,
  qrImage,
  qrText,
  shortUrl,
  urls,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  qrImage: string;
  qrText: string;
  shortUrl: string | null;
  urls: QpayBankUrl[];
}) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paidRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (paidRef.current) return;
    setChecking(true);
    setError(null);
    const result = await checkPaymentStatus(orderId);
    setChecking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.status === "paid") {
      paidRef.current = true;
      setStatus("paid");
      // Богино хугацааны баталгаажуулалт харуулаад success руу
      setTimeout(() => router.push(`/checkout/success/${orderId}`), 1200);
    }
  }, [orderId, router]);

  // Автомат polling — зөвхөн санамжийг зөвшөөрсний дараа
  useEffect(() => {
    if (!agreed) return;
    const id = setInterval(() => {
      if (!paidRef.current) void runCheck();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [agreed, runCheck]);

  const qrSrc = qrImage.startsWith("data:")
    ? qrImage
    : `data:image/png;base64,${qrImage}`;

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Нүүр
        </Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-brand-700">
          Сагс
        </Link>
        <span>/</span>
        <span className="text-ink-700">QPay төлбөр</span>
      </nav>

      {!agreed ? (
        /* ===== Заавал уншиж зөвшөөрөх санамж ===== */
        <div className="mx-auto max-w-[560px]">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 md:p-8">
            <div className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Захиалга {orderNumber}
            </div>
            <div className="font-display mb-5 text-center text-2xl font-black text-brand-700">
              {formatMnt(total)}
            </div>

            <h2 className="font-display mb-3 text-lg font-extrabold text-ink-900">
              Төлбөр төлөхийн өмнө уншина уу
            </h2>
            <ul className="space-y-2.5 text-sm text-ink-700">
              <li className="flex gap-2.5">
                <span className="text-brand-600">•</span>
                <span>
                  Гүйлгээ хийхдээ <strong>{formatMnt(total)}</strong> дүнг
                  бүтэн, зөв төлнө үү.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-brand-600">•</span>
                <span>QR кодыг зөвхөн энэ захиалгын төлбөрт ашиглана.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-brand-600">•</span>
                <span>
                  Төлбөр амжилттай төлөгдсөний дараа захиалга баталгаажиж,
                  бэлтгэл эхэлнэ.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-brand-600">•</span>
                <span>
                  Дутуу эсвэл буруу дүнгээр төлсөн тохиолдолд захиалга
                  баталгаажихгүй болохыг анхаарна уу.
                </span>
              </li>
            </ul>

            <button
              onClick={() => setAgreed(true)}
              className="mt-6 flex w-full items-center justify-center rounded-[12px] bg-brand-600 py-4 text-base font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700"
            >
              Ойлголоо, төлбөр рүү шилжих →
            </button>
            <Link
              href={`/account/orders/${orderId}`}
              className="mt-2 block text-center text-xs font-bold text-ink-500 hover:text-brand-700 hover:underline"
            >
              Дараа төлөх
            </Link>
          </div>
        </div>
      ) : (
      <div className="mx-auto grid max-w-[760px] gap-6 lg:grid-cols-[360px_1fr]">
        {/* QR талбар */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Захиалга {orderNumber}
          </div>
          <div className="font-display mb-4 text-2xl font-black text-brand-700">
            {formatMnt(total)}
          </div>

          {status === "paid" ? (
            <div className="grid place-items-center py-10">
              <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full border-[3px] border-lime-500 bg-lime-100 text-5xl text-lime-700">
                ✓
              </div>
              <div className="font-display text-lg font-extrabold text-lime-700">
                Төлбөр амжилттай!
              </div>
              <div className="mt-1 text-xs text-ink-500">Шилжүүлж байна…</div>
            </div>
          ) : (
            <>
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  alt="QPay QR код"
                  className="mx-auto h-[240px] w-[240px] rounded-xl border border-ink-100"
                />
              ) : (
                <div className="mx-auto grid h-[240px] w-[240px] place-items-center rounded-xl border border-dashed border-ink-200 text-xs text-ink-500">
                  QR код байхгүй
                </div>
              )}
              <p className="mt-4 text-sm text-ink-700">
                Банкны апп-аараа QR кодыг уншуулна уу
              </p>
              {qrText && (
                <p className="mt-1 break-all text-[10px] text-ink-300">{qrText.slice(0, 24)}…</p>
              )}
            </>
          )}
        </div>

        {/* Заавар + банкны апп-ууд */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-700">
              Гар утаснаас төлөх
            </h3>
            <p className="mb-3 text-sm text-ink-500">
              Доорх банкны апп дээр дарж шууд төлбөрөө төлнө үү:
            </p>
            {urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {urls.map((u) => (
                  <a
                    key={u.name}
                    href={u.link}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 bg-white p-2.5 text-center transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {u.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.logo}
                        alt={u.description}
                        className="h-9 w-9 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-ink-100 text-[10px]">
                        🏦
                      </div>
                    )}
                    <span className="line-clamp-1 text-[10px] font-semibold text-ink-700">
                      {u.description}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-500">
                Банкны апп-ын жагсаалт ачааллаагүй байна — QR кодыг ашиглана уу.
              </p>
            )}
            {shortUrl && (
              <a
                href={shortUrl}
                className="mt-3 block text-center text-xs font-bold text-brand-700 hover:underline"
              >
                qPay богино холбоосоор нээх →
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-lime-300 bg-lime-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              {checking ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-lime-600 border-t-transparent" />
                  Төлбөр шалгаж байна…
                </>
              ) : (
                <>⏳ Төлбөрийг хүлээж байна. Та төлсний дараа автоматаар баталгаажна.</>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-700">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => void runCheck()}
              disabled={checking || status === "paid"}
              className="flex flex-1 items-center justify-center rounded-[10px] bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              Төлбөрөө шалгах
            </button>
            <Link
              href={`/account/orders/${orderId}`}
              className="flex flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-ink-200 px-5 py-3 font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              Дараа төлөх
            </Link>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
