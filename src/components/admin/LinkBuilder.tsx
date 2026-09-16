"use client";

/**
 * Шошготой холбоос үүсгэгч.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: "Шууд орсон" дотор QR код, чатын холбоос, SMS,
 * гараар бичсэн хаяг бүгд хольцолдож байдаг. Эдгээр нь эх сурвалжийн
 * мэдээлэлгүй ирдэг тул GA4 ялгах ямар ч боломжгүй — ганц зам нь
 * холбоос дээрээ `?utm_source=` шошго тавих.
 *
 * Гараар бичвэл алдаа гарна (`utm_source=Messenger` ба `messenger` нь
 * GA4-д ӨӨР суваг болно) тул энд сонгоод хуулж авдаг болгов.
 * Шошгуудыг `traffic-source.ts` таньдаг — хоёр газар зөрвөл трафик
 * "Тодорхойгүй" рүү унана.
 */

import { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";

/** `traffic-source.ts`-ийн UTM_KEYS-тэй ЯГ таарч байх ёстой */
const CHANNELS = [
  { source: "messenger", medium: "chat", label: "Messenger (чат)", icon: "💬" },
  { source: "viber", medium: "chat", label: "Viber", icon: "💜" },
  { source: "qr", medium: "offline", label: "QR код", icon: "▩" },
  { source: "sms", medium: "sms", label: "Мессеж (SMS)", icon: "📱" },
  { source: "email", medium: "email", label: "И-мэйл", icon: "✉️" },
  { source: "print", medium: "offline", label: "Хэвлэмэл, сав баглаа", icon: "🏷️" },
] as const;

const QUICK_PAGES = [
  { path: "/", label: "Нүүр" },
  { path: "/products", label: "Бүтээгдэхүүн" },
  { path: "/brands/vidan", label: "VIDAN брэнд" },
  { path: "/delivery", label: "Хүргэлт" },
] as const;

export function LinkBuilder({ siteUrl }: { siteUrl: string }) {
  const [channel, setChannel] = useState<string>(CHANNELS[0].source);
  const [path, setPath] = useState("/");
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const picked = CHANNELS.find((c) => c.source === channel) ?? CHANNELS[0];

  const link = useMemo(() => {
    const clean = path.trim().startsWith("/") ? path.trim() : `/${path.trim()}`;
    const url = new URL(clean, siteUrl);
    url.searchParams.set("utm_source", picked.source);
    url.searchParams.set("utm_medium", picked.medium);
    return url.toString();
  }, [path, picked, siteUrl]);

  useEffect(() => {
    setCopied(false);
    let alive = true;
    QRCode.toDataURL(link, { width: 480, margin: 1 })
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="print-hide rounded-2xl border border-ink-200 bg-white">
      <div className="border-b border-ink-200 px-5 py-4">
        <h3 className="font-display text-[15px] font-extrabold">
          Шошготой холбоос үүсгэх
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-500">
          Чат, QR, мессежээр тараасан холбоос &quot;Шууд орсон&quot; дотор
          нуугддаг. Эндээс үүсгэсэн холбоос тусдаа мөр болж харагдана.
        </p>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1fr_200px]">
        <div className="space-y-4">
          {/* Суваг */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Хаана тавих вэ
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c.source}
                  type="button"
                  onClick={() => setChannel(c.source)}
                  className={`rounded-[10px] border-[1.5px] px-3 py-1.5 text-[12px] font-bold transition ${
                    c.source === channel
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 text-ink-700 hover:border-brand-300"
                  }`}
                >
                  <span className="mr-1">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Хуудас */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Аль хуудас руу
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PAGES.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  onClick={() => setPath(p.path)}
                  className={`rounded-[10px] border-[1.5px] px-3 py-1.5 text-[12px] font-bold transition ${
                    p.path === path.trim()
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 text-ink-700 hover:border-brand-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/products/alimnii-nuhash-900g"
              className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2 font-mono text-[13px] outline-none transition focus:border-brand-500"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Тодорхой бараа руу чиглүүлэх бол хаягийг нь буулгаж тавина
            </p>
          </div>

          {/* Үр дүн */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Бэлэн холбоос
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-[10px] border-[1.5px] border-ink-200 bg-cream px-3 py-2.5 font-mono text-[12px] text-ink-900 outline-none"
              />
              <button
                type="button"
                onClick={() => void copy()}
                className={`whitespace-nowrap rounded-[10px] px-5 py-2.5 text-[13px] font-bold text-white transition ${
                  copied ? "bg-lime-600" : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                {copied ? "✓ Хуулагдлаа" : "Хуулах"}
              </button>
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="text-center">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            QR код
          </div>
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="Холбоосын QR код"
                className="mx-auto h-[180px] w-[180px] rounded-xl border border-ink-200"
              />
              <a
                href={qr}
                download={`vidan-${picked.source}.png`}
                className="mt-2 block rounded-[10px] border-[1.5px] border-ink-200 py-2 text-[12px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
              >
                Татаж авах
              </a>
            </>
          ) : (
            <div className="mx-auto grid h-[180px] w-[180px] place-items-center rounded-xl border border-dashed border-ink-200 text-[12px] text-ink-500">
              …
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
