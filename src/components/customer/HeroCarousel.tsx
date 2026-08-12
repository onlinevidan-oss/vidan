"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/lib/queries/settings";

const AUTOPLAY_MS = 5000;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const n = slides.length;
  const paused = useRef(false);
  const startX = useRef<number | null>(null);

  const go = (i: number) => setIndex(((i % n) + n) % n);

  // Авто-эргэлт — index өөрчлөгдөх бүрд timer шинэчлэгдэнэ (гар дарсны дараа
  // 5 сек хүлээнэ). Hover/drag үед зогсоно.
  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => {
      if (!paused.current) setIndex((p) => (p + 1) % n);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [n, index]);

  if (n === 0) return null;

  return (
    <section
      className="my-6 md:my-8"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div
        className="relative overflow-hidden rounded-[16px] bg-ink-900"
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          paused.current = true;
        }}
        onTouchEnd={(e) => {
          if (startX.current != null) {
            const dx = e.changedTouches[0].clientX - startX.current;
            if (dx < -40) go(index + 1);
            else if (dx > 40) go(index - 1);
          }
          startX.current = null;
          paused.current = false;
        }}
      >
        {/* Track */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, idx) => (
            <Slide key={idx} slide={s} priority={idx === 0} />
          ))}
        </div>

        {/* Заагч цэгүүд */}
        {n > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Слайд ${idx + 1}`}
                onClick={() => go(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === index
                    ? "w-6 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}

        {/* Прев/Дараах сум (desktop) */}
        {n > 1 && (
          <>
            <button
              aria-label="Өмнөх"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-2xl text-white backdrop-blur transition hover:bg-white/40 md:grid"
            >
              ‹
            </button>
            <button
              aria-label="Дараах"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-2xl text-white backdrop-blur transition hover:bg-white/40 md:grid"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Нэг слайд — постер зураг + (сонголтоор) текст/товч давхарлана */
function Slide({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const hasText = !!(slide.badge || slide.title || slide.body || slide.btn_label);
  // Текстгүй цэвэр постер + линктэй бол бүх слайдыг дарж болно
  const wholeLink = !hasText && slide.btn_href ? slide.btn_href : null;

  const inner = (
    <div className="relative min-h-[360px] w-full min-w-full sm:min-h-[460px] md:min-h-[520px]">
      {slide.image_url && (
        <Image
          src={slide.image_url}
          alt={slide.title || ""}
          fill
          className="pointer-events-none object-cover object-center"
          unoptimized={slide.image_url.startsWith("http")}
          priority={priority}
          sizes="100vw"
        />
      )}

      {hasText && (
        <>
          {/* Доороос дээш gradient — текст уншигдахуйц */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/55 to-ink-900/15" />

          {slide.badge && (
            <div className="absolute left-6 top-6 z-10 sm:left-12 sm:top-12">
              <span className="inline-flex w-max items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur">
                {slide.badge}
              </span>
            </div>
          )}

          <div className="absolute inset-0 z-10 flex items-end">
            <div className="max-w-[600px] p-6 pb-9 text-white sm:p-12">
              {slide.title && (
                <>
                  <div className="mb-4 h-1.5 w-14 rounded-full bg-lime-400" />
                  <h1 className="font-display max-w-[560px] whitespace-pre-line text-[26px] font-black uppercase leading-[1.08] tracking-tight [text-shadow:0_2px_20px_rgba(0,0,0,0.55)] md:text-[40px]">
                    {slide.title}
                  </h1>
                </>
              )}
              {slide.body && (
                <p className="mt-4 max-w-[400px] text-[13px] leading-relaxed text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] sm:text-sm">
                  {slide.body}
                </p>
              )}
              {slide.btn_label && (
                <Link
                  href={slide.btn_href || "/products"}
                  className="mt-7 inline-flex w-max items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-ink-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-lime-400"
                >
                  {slide.btn_label}
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (wholeLink) {
    return (
      <Link href={wholeLink} className="block w-full min-w-full">
        {inner}
      </Link>
    );
  }
  return inner;
}
