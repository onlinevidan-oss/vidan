import Link from "next/link";
import Image from "next/image";

export type BrandCardData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  card_from: string | null;
  card_to: string | null;
  logo_mode: string;
  product_count?: number;
};

export function BrandCard({ brand }: { brand: BrandCardData }) {
  const isCover = brand.logo_mode === "cover";
  const gradient =
    brand.card_from && brand.card_to
      ? `linear-gradient(135deg, ${brand.card_from}, ${brand.card_to})`
      : "linear-gradient(135deg, #f5efe3, #e6e1d8)";

  return (
    <Link
      href={`/products?brand=${brand.slug}`}
      className="group flex flex-col"
    >
      <div
        className="relative aspect-square overflow-hidden rounded-[16px] shadow-[var(--shadow-brand-sm)] transition group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-brand-md)]"
        style={{ background: gradient }}
      >
        {brand.logo_url &&
          (isCover ? (
            <Image
              src={brand.logo_url}
              alt={brand.name}
              fill
              className="object-cover transition group-hover:scale-105"
              unoptimized={brand.logo_url.startsWith("http")}
              sizes="(max-width: 768px) 45vw, 20vw"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-7">
              <Image
                src={brand.logo_url}
                alt={brand.name}
                width={240}
                height={140}
                className="max-h-[62%] w-auto max-w-[80%] object-contain transition group-hover:scale-105"
                unoptimized={brand.logo_url.startsWith("http")}
              />
            </div>
          ))}
      </div>
      <div className="mt-2.5 text-center">
        <div className="text-sm font-bold uppercase tracking-wide text-ink-900">
          {brand.name}
        </div>
        {brand.product_count !== undefined && (
          <div className="mt-0.5 text-[11px] text-ink-500">
            {brand.product_count > 0
              ? `${brand.product_count} бүтээгдэхүүн`
              : "Тун удахгүй"}
          </div>
        )}
      </div>
    </Link>
  );
}
