import Link from "next/link";
import Image from "next/image";
import type { BrandCardData } from "@/components/customer/BrandCard";

/**
 * Брэндийн тууз — жижиг логонууд хөндлөн тасралтгүй урсана.
 *
 * Том дөрвөлжин картууд нүүр хуудсанд хэт их зай эзэлж байсныг сольсон.
 * Хулгана/хуруу тавихад зогсоно (уншиж, дарах боломжтой).
 * Хөдөлгөөн багасгах тохиргоотой хэрэглэгчид зүгээр л зогсонги харагдана.
 */
export function BrandStrip({ brands }: { brands: BrandCardData[] }) {
  if (brands.length === 0) return null;

  // Тасралтгүй давталт үүсгэхийн тулд жагсаалтыг 3 удаа давтана
  const loop = [...brands, ...brands, ...brands];

  return (
    <div className="group relative overflow-hidden">
      {/* Хоёр талын бүдгэрэлт — тууз "таслагдаж" харагдахгүй */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-cream to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-cream to-transparent" />

      <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((b, i) => (
          <BrandPill key={`${b.id}-${i}`} brand={b} />
        ))}
      </div>
    </div>
  );
}

function BrandPill({ brand }: { brand: BrandCardData }) {
  const gradient =
    brand.card_from && brand.card_to
      ? `linear-gradient(135deg, ${brand.card_from}, ${brand.card_to})`
      : "linear-gradient(135deg, #f5efe3, #e6e1d8)";

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group/pill flex w-[132px] shrink-0 flex-col items-center"
      title={brand.name}
    >
      <div
        className="grid h-[68px] w-full place-items-center overflow-hidden rounded-xl px-4 shadow-[var(--shadow-brand-sm)] transition group-hover/pill:-translate-y-0.5 group-hover/pill:shadow-[var(--shadow-brand-md)]"
        style={{ background: gradient }}
      >
        {brand.logo_url ? (
          <Image
            src={brand.logo_url}
            alt={brand.name}
            width={160}
            height={80}
            className="max-h-[44px] w-auto max-w-full object-contain"
          />
        ) : (
          <span className="text-xs font-extrabold uppercase text-white">
            {brand.name}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-center">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-900">
          {brand.name}
        </div>
        {brand.product_count !== undefined && (
          <div className="text-[10px] text-ink-500">
            {brand.product_count > 0
              ? `${brand.product_count} бүтээгдэхүүн`
              : "Тун удахгүй"}
          </div>
        )}
      </div>
    </Link>
  );
}
