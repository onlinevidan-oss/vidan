"use client";

/**
 * Хайлтын талбар — бичиж байхад бүтээгдэхүүнийг зурагтайгаар санал болгоно.
 *
 * JS ажиллахгүй үед ч энгийн GET form хэвээр ажиллана
 * (Enter → /products?search=...).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMnt } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
};

const DEBOUNCE_MS = 200;

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  // Бичих бүрт биш — түр хүлээгээд нэг л удаа асууна.
  // (setState нь зөвхөн timeout дотор — effect-ийн биед синхроноор биш)
  useEffect(() => {
    const t = term.trim();
    if (!t) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(t)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* цуцлагдсан хүсэлт — алгасна */
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // Гадуур дарахад хаана
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(slug: string) {
    setOpen(false);
    setTerm("");
    router.push(`/products/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") return setOpen(false);
    if (!open || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      // Сонгосон бараа руу шууд — form илгээхгүй
      e.preventDefault();
      go(items[active].slug);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form method="get" action="/products" className="relative w-full">
        <input
          type="search"
          name="search"
          value={term}
          onChange={(e) => {
            const v = e.target.value;
            setTerm(v);
            if (!v.trim()) {
              setItems([]);
              setOpen(false);
            }
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Бүтээгдэхүүн хайх"
          placeholder={
            compact
              ? "Бүтээгдэхүүн хайх..."
              : "Бүтээгдэхүүн хайх... (жнь. өргөст хэмх, чанамал)"
          }
          className={`w-full rounded-full border-[1.5px] border-ink-200 bg-cream pl-11 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)] ${
            compact ? "py-2.5" : "py-3"
          }`}
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-50">
          🔍
        </span>
        <button type="submit" className="sr-only">
          Хайх
        </button>
      </form>

      {open && term.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-brand-lg)]">
          {items.length === 0 ? (
            <div className="px-4 py-5 text-center text-sm text-ink-500">
              Илэрц олдсонгүй
            </div>
          ) : (
            <>
              <ul>
                {items.map((it, i) => (
                  <li key={it.slug}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(it.slug)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                        i === active ? "bg-cream" : "hover:bg-cream"
                      }`}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-cream-100">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.image}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="opacity-40">📦</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink-900">
                          {it.name}
                        </span>
                        <span className="block text-xs font-bold text-brand-700">
                          {formatMnt(it.price)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <a
                href={`/products?search=${encodeURIComponent(term.trim())}`}
                className="block border-t border-ink-100 px-4 py-2.5 text-center text-xs font-bold text-brand-700 transition hover:bg-cream"
              >
                Бүх илэрцийг харах →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
