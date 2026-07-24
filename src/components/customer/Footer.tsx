import Image from "next/image";
import Link from "next/link";

const FB_PAGE = "https://www.facebook.com/durvunulzii";

export function Footer() {
  return (
    <footer className="mt-16 bg-ink-900 px-5 py-14 text-white">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="inline-block rounded-lg bg-white px-2.5 py-1.5">
              <Image
                src="/vidan-logo.png"
                alt="VIDAN"
                width={107}
                height={48}
              />
            </div>
            <p className="mt-4 max-w-[340px] text-sm opacity-70">
              Монгол хүн бүрт баталгаатай, эрүүл хүнсийг өргөн барьж буй
              үндэсний үйлдвэрлэгч — Дөрвөн Өлзий ХХК.
            </p>
            <div className="mt-4 flex gap-2.5">
              {[
                ["f", "https://www.facebook.com/durvunulzii"],
                ["@", "https://www.instagram.com/durvunulziillcofficial/"],
                ["in", "https://www.linkedin.com/company/durvun-ulzii-llc/"],
                ["▶", "#"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 font-bold transition hover:bg-lime-500 hover:text-ink-900"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          <FooterCol
            title="Компани"
            items={[
              { label: "Бидний тухай", href: "#" },
              { label: "Үйлдвэрлэл", href: "#" },
              { label: "Мэдээ мэдээлэл", href: FB_PAGE, external: true },
              { label: "Ажлын байр", href: "#" },
              { label: "Хамтрагч", href: "#" },
            ]}
          />
          <FooterCol
            title="Тусламж"
            items={[
              { label: "Санал хүсэлт", href: "/feedback" },
              { label: "Хүргэлт (24 цаг)", href: "/feedback" },
              { label: "Буцаалт", href: FB_PAGE, external: true },
              { label: "Санал гомдол", href: FB_PAGE, external: true },
              { label: "Түгээмэл асуулт", href: FB_PAGE, external: true },
            ]}
          />
          <div>
            <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wider">
              Холбоо барих
            </h4>
            <ul className="space-y-2.5 text-sm opacity-70">
              <li>
                <a href="tel:+97675752525">📞 7575-2525</a>
              </li>
              <li>
                <a href="tel:+97699073425">🛒 9907-3425 (борлуулалт)</a>
              </li>
              <li>
                <a href="mailto:info@durvun-ulzii.mn">
                  ✉️ info@durvun-ulzii.mn
                </a>
              </li>
              <li className="mt-2 text-[13px]">
                📍 Баянгол дүүрэг, 20-р хороо, Үйлдвэрийн баруун бүс ХД-50
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[13px] opacity-60 md:flex-row">
          <span>© 2025 Дөрвөн Өлзий ХХК. Бүх эрх хуулиар хамгаалагдсан.</span>
          <span>VIDAN брэнд · Үндэсний үйлдвэрлэл</span>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; href: string; external?: boolean };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-extrabold uppercase tracking-wider">
        {title}
      </h4>
      <ul className="space-y-2.5 text-sm opacity-70">
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:opacity-100 hover:text-lime-500"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="transition hover:opacity-100 hover:text-lime-500"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
