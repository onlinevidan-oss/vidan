"use client";

/**
 * "Жимс" хуудасны дээд баннерын зургууд — 5 секунд тутам зөөлөн
 * солигдоно (бүдгэрч шилжих + аажим томрох). Бичиг нь дээрээ хөдөлгөөнгүй
 * үлдэнэ. Нэг л зураг бол энгийн зураг.
 */
import { useEffect, useState } from "react";
import Image from "next/image";

const INTERVAL_MS = 5000;

export function FruitBannerSlides({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  const n = urls.length;

  useEffect(() => {
    if (n <= 1) return;
    // Хөдөлгөөн багасгах тохиргоотой хүнд автоматаар солихгүй
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % n);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, [n]);

  return (
    <>
      {urls.map((url, i) => (
        <Image
          key={url}
          src={url}
          alt=""
          fill
          priority={i === 0}
          // Vercel-ийн зураг оновчлолын хязгаар (402) — шууд ачаална
          unoptimized
          sizes="(max-width: 1240px) 100vw, 1240px"
          className={`object-cover object-center transition-[opacity,transform] ease-out motion-reduce:transition-none ${
            i === index ? "scale-105 opacity-100 duration-[1200ms,6000ms]" : "scale-100 opacity-0 duration-[1200ms,0ms]"
          }`}
        />
      ))}
      {n > 1 && (
        <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              aria-label={`${i + 1}-р зураг`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
