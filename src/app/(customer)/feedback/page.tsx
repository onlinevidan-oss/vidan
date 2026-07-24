import Link from "next/link";
import { FeedbackForm } from "@/components/customer/FeedbackForm";

export const metadata = { title: "Санал хүсэлт | VIDAN" };

const FB_PAGE = "https://www.facebook.com/durvunulzii";

export default function FeedbackPage() {
  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          Нүүр
        </Link>
        <span>/</span>
        <span className="text-ink-700">Санал хүсэлт</span>
      </nav>

      <div className="mx-auto max-w-[620px]">
        <h1 className="font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
          Санал хүсэлт
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-700">
          Таны санал бидэнд үнэ цэнэтэй. Үйлчилгээ, бүтээгдэхүүнээ сайжруулахад
          туслах санал, гомдол, талархлаа доор бичиж үлдээгээрэй.
        </p>

        <FeedbackForm />

        <div className="mt-5 rounded-2xl border border-ink-200 bg-cream p-5 text-sm text-ink-700">
          <div className="font-bold text-ink-900">Шууд холбогдох</div>
          <p className="mt-1.5">
            Буцаалт, яаралтай асуудлаар манай Facebook хуудсаар дамжуулан бичээрэй
            — хамгийн хурдан хариу авна.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
            <a
              href={FB_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand-700 hover:underline"
            >
              Facebook хуудас →
            </a>
            <a href="tel:+97675752525" className="font-bold text-brand-700 hover:underline">
              📞 7575-2525
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
