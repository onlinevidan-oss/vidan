import { getCommerceSettings, getHeroSlides } from "@/lib/queries/settings";
import { HeroSlidesForm } from "@/components/admin/HeroSlidesForm";
import { CommerceSettingsForm } from "@/components/admin/CommerceSettingsForm";

export const metadata = { title: "Тохиргоо | VIDAN Backoffice" };

export default async function AdminSettings() {
  const [slides, commerce] = await Promise.all([
    getHeroSlides(),
    getCommerceSettings(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          ⚙️ Тохиргоо
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Худалдааны дүрэм болон нүүр хуудасны агуулга
        </p>
      </div>

      <section className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink-900">
          Хүргэлт ба захиалга
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Эдгээр утга сагс, checkout болон серверийн тооцоололд шууд үйлчилнэ
        </p>
        <CommerceSettingsForm initial={commerce} />
      </section>

      <section className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink-900">
          Нүүр хуудасны постерууд (Carousel)
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Эргэлддэг постерууд — нэмэх, засах, дараалал өөрчлөх боломжтой
        </p>
        <HeroSlidesForm initial={slides} />
      </section>
    </div>
  );
}
