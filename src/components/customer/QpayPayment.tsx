"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMnt } from "@/lib/utils";
import { checkPaymentStatus } from "@/app/(customer)/checkout/payment/[orderId]/actions";
import type { QpayBankUrl } from "@/lib/qpay/orders";
import { msUntilExpiry } from "@/lib/order-hold";

/** Эхний 2 минут хурдан шалгана — хүн банкны апп руу орж, шууд эргэж ирдэг */
const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 8000;
const FAST_WINDOW_MS = 120_000;

function formatLeft(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h} цаг ${m} мин` : `${h} цаг`;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s} сек`;
}

export function QpayPayment({
  orderId,
  orderNumber,
  total,
  createdAt,
  qrImage,
  qrText,
  shortUrl,
  urls,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  createdAt: string;
  qrImage: string;
  qrText: string;
  shortUrl: string | null;
  urls: QpayBankUrl[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftMs, setLeftMs] = useState<number | null>(null);
  const paidRef = useRef(false);
  const startedAt = useRef<number | null>(null);

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
      setTimeout(() => router.push(`/checkout/success/${orderId}`), 1200);
    }
  }, [orderId, router]);

  // Автомат шалгалт — хуудас нээгдмэгц шууд эхэлнэ
  useEffect(() => {
    // Date.now()-г render дотор дуудвал цэвэр байдлын дүрэм зөрчигдөнө
    // (дахин рендэр бүрд өөр утга гарна) — эхлэлийг энд тавина.
    startedAt.current ??= Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (paidRef.current) return;
      void runCheck();
      const elapsed = Date.now() - (startedAt.current ?? Date.now());
      timer = setTimeout(tick, elapsed < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS);
    };
    timer = setTimeout(tick, POLL_FAST_MS);
    return () => clearTimeout(timer);
  }, [runCheck]);

  // Банкны апп-аас буцаж ирмэгц шууд шалгана.
  // Гар утасны браузер нуугдсан таб дээрх timer-ийг удаашруулдаг тул энэ чухал.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && !paidRef.current) void runCheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [runCheck]);

  // Нөөц барих хугацаа. Hydration зөрөхгүйн тулд зөвхөн mount хийсний дараа.
  //
  // Хугацааг `order-hold.ts` бодно — шөнийн цагт захиалга цуцлагддаггүй
  // тул 23:00-д өгсөн захиалгад "2 цаг" гэж худал хэлэхгүй, өглөөний
  // 09:00 хүртэлх бодит хугацааг харуулна (release_stale_orders-той ижил).
  useEffect(() => {
    const created = new Date(createdAt);
    const update = () => setLeftMs(msUntilExpiry(created));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const qrSrc = qrImage.startsWith("data:")
    ? qrImage
    : `data:image/png;base64,${qrImage}`;
  const expired = leftMs !== null && leftMs <= 0;

  if (status === "paid") {
    return (
      <div className="my-20 grid place-items-center">
        <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-full border-[3px] border-lime-500 bg-lime-100 text-6xl text-lime-700">
          ✓
        </div>
        <div className="font-display text-2xl font-black text-lime-700">
          Төлбөр амжилттай!
        </div>
        <div className="mt-1 text-sm text-ink-500">Шилжүүлж байна…</div>
      </div>
    );
  }

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

      <div className="mx-auto max-w-[760px]">
        {/* ===== Дүн ба хугацаа ===== */}
        <div className="mb-4 rounded-2xl border border-ink-200 bg-white p-5 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Захиалга {orderNumber}
          </div>
          <div className="font-display my-1 text-3xl font-black text-brand-700">
            {formatMnt(total)}
          </div>
          <p className="text-xs text-ink-500">
            Энэ дүнг <strong className="text-ink-700">бүтэн, яг таг</strong> төлнө үү
          </p>

          {expired ? (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">
              Нөөцлөх хугацаа дууссан — захиалга цуцлагдсан байж болзошгүй
            </div>
          ) : leftMs !== null ? (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-bold text-lime-700">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-lime-600" />
              Бараа тань {formatLeft(leftMs)} нөөцлөгдсөн
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* ===== Банкны апп — гар утсанд гол зам (90% нь утаснаас ордог) ===== */}
          <div className="rounded-2xl border-[1.5px] border-brand-200 bg-white p-5 lg:order-2">
            <h3 className="font-display mb-1 text-base font-extrabold text-ink-900">
              Банкаа сонгоод төлнө үү
            </h3>
            <p className="mb-3 text-xs text-ink-500">
              Дарахад банкны апп нээгдэж, дүн бөглөгдсөн байна
            </p>

            {urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                {urls.map((u) => (
                  <a
                    key={u.name}
                    href={u.link}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 bg-white p-2.5 text-center transition active:scale-95 hover:border-brand-300 hover:bg-brand-50"
                  >
                    {u.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.logo}
                        alt={u.description}
                        className="h-10 w-10 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink-100 text-[10px]">
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
              <p className="rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
                Банкны апп-ын жагсаалт ачааллаагүй байна — доорх QR кодыг ашиглана уу.
              </p>
            )}

            {shortUrl && (
              <a
                href={shortUrl}
                className="mt-3 block rounded-[10px] border-[1.5px] border-brand-500 py-2.5 text-center text-xs font-bold text-brand-700 transition hover:bg-brand-50"
              >
                qPay апп-аар нээх →
              </a>
            )}

            {/* Төлбөр хүлээж буй заалт */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-lime-50 px-3 py-2.5 text-xs font-semibold text-ink-900">
              {checking ? (
                <>
                  <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-lime-600 border-t-transparent" />
                  Төлбөр шалгаж байна…
                </>
              ) : (
                <>
                  <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-lime-600" />
                  Төлсний дараа энэ хуудас автоматаар баталгаажна
                </>
              )}
            </div>

            {error && (
              <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-2.5 text-[11px] font-semibold text-brand-700">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={() => void runCheck()}
              disabled={checking}
              className="mt-2 w-full rounded-[10px] border-[1.5px] border-ink-200 py-2.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
            >
              Төлсөн, шалгах
            </button>
          </div>

          {/* ===== QR — өөр төхөөрөмжөөс уншихад ===== */}
          <div className="rounded-2xl border border-ink-200 bg-white p-5 text-center lg:order-1">
            <h3 className="font-display mb-1 text-sm font-extrabold text-ink-700">
              Эсвэл QR уншуулах
            </h3>
            <p className="mb-3 text-[11px] text-ink-500">
              Өөр утас, компьютерээс төлөх бол
            </p>
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrSrc}
                alt="QPay QR код"
                className="mx-auto h-[200px] w-[200px] rounded-xl border border-ink-100"
              />
            ) : (
              <div className="mx-auto grid h-[200px] w-[200px] place-items-center rounded-xl border border-dashed border-ink-200 text-xs text-ink-500">
                QR код байхгүй
              </div>
            )}
            {qrText && (
              <p className="mt-2 break-all text-[10px] text-ink-300">
                {qrText.slice(0, 24)}…
              </p>
            )}
          </div>
        </div>

        {/* ===== Нөхцөл — хаалт биш, задардаг ===== */}
        <details className="mt-4 rounded-2xl border border-ink-200 bg-white px-5 py-3.5">
          <summary className="cursor-pointer text-xs font-bold text-ink-700 hover:text-brand-700">
            Үйлчилгээний нөхцөл
          </summary>
          <ul className="mt-3 space-y-2 text-xs text-ink-700">
            <li className="flex gap-2">
              <span className="text-brand-600">•</span>
              <span>
                Гүйлгээ хийхдээ <strong>{formatMnt(total)}</strong> дүнг бүтэн,
                зөв төлнө үү. Дутуу эсвэл буруу дүнгээр төлсөн тохиолдолд
                захиалга баталгаажихгүй.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">•</span>
              <span>QR кодыг зөвхөн энэ захиалгын төлбөрт ашиглана.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">•</span>
              <span>
                Төлбөр төлөгдсөний дараа захиалга баталгаажиж,{" "}
                <strong>Улаанбаатар хотод 24 цагийн дотор</strong> хүргэнэ.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand-600">•</span>
              <span>
                Буцаалт, санал гомдлыг манай{" "}
                <a
                  href="https://www.facebook.com/vidanofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-700 hover:underline"
                >
                  Facebook хуудсаар
                </a>{" "}
                дамжуулан хүлээн авна.
              </span>
            </li>
          </ul>
        </details>

        <Link
          href={`/account/orders/${orderId}`}
          className="mt-3 block text-center text-[11px] text-ink-500 hover:text-brand-700 hover:underline"
        >
          Дараа төлөх
        </Link>
      </div>
    </div>
  );
}
