import {
  getAboutBrochure,
  getCommerceSettings,
  getHeroSlides,
  getSaleCampaign,
  getSaleCampaignCount,
  getSmsSettings,
} from "@/lib/queries/settings";
import { getBrands } from "@/lib/queries/products";
import { HeroSlidesForm } from "@/components/admin/HeroSlidesForm";
import { CommerceSettingsForm } from "@/components/admin/CommerceSettingsForm";
import { AboutBrochureForm } from "@/components/admin/AboutBrochureForm";
import { SaleCampaignForm } from "@/components/admin/SaleCampaignForm";
import { SmsSettingsForm } from "@/components/admin/SmsSettingsForm";
import { SmsBroadcastPanel, type BroadcastRow } from "@/components/admin/SmsBroadcastPanel";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { broadcastRecipients } from "@/lib/sms/recipients";
import { ubDateKey } from "@/lib/datetime";

/** Масс SMS-ийн хүлээн авагчийн тоо — cron-ийн тоолдогтой ижил дүрмээр */
async function broadcastRecipientCount(): Promise<number> {
  const admin = createAdminClient();
  const profiles: { id: string; phone: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from("profiles").select("id, phone").range(from, from + 999);
    profiles.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: staff } = await admin.from("staff").select("id");
  return broadcastRecipients(profiles, new Set((staff ?? []).map((s) => s.id))).length;
}

export const metadata = { title: "Тохиргоо | VIDAN Backoffice" };

export default async function AdminSettings() {
  const supabase = await createClient();
  const [slides, commerce, brochure, campaign, discountedCount, brands, sms, broadcasts, recipients] =
    await Promise.all([
      getHeroSlides(),
      getCommerceSettings(),
      getAboutBrochure(),
      getSaleCampaign(),
      getSaleCampaignCount(),
      getBrands(),
      getSmsSettings(),
      supabase
        .from("sms_broadcasts")
        .select("id, text, send_at, status, recipients, sent, failed")
        .order("send_at", { ascending: false })
        .limit(20),
      broadcastRecipientCount(),
    ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 sm:p-8">
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
          📱 SMS мэдэгдэл
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Захиалагч руу ямар SMS явахыг эндээс удирдана
        </p>
        <SmsSettingsForm initial={sms} />
      </section>

      <section className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink-900">
          📣 Масс SMS
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Бүртгэлтэй бүх дугаар руу хуваарьт цагт. Холбоос оруулахгүй — CallPro
          баталгаажаагүй холбоостой SMS-ийг татгалздаг
        </p>
        <SmsBroadcastPanel
          rows={(broadcasts.data ?? []) as BroadcastRow[]}
          recipients={recipients}
          today={ubDateKey()}
        />
      </section>

      <section className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink-900">
          🔥 Хямдралын кампанит ажил
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Брэнд сонгож хугацаатай хямдрал зарлана — хугацаа дуусмагц үнэ
          автоматаар хэвэндээ орно
        </p>
        <SaleCampaignForm
          initial={campaign}
          brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
          discountedCount={discountedCount}
        />
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

      <section className="rounded-[14px] border-[1.5px] border-ink-200 bg-white p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold text-ink-900">
          Бидний тухай (Танилцуулга PDF)
        </h2>
        <p className="mb-5 text-xs text-ink-500">
          Компанийн танилцуулгыг PDF хэлбэрээр байршуулна — /about хуудсанд
          хуудас бүр нь дараалан харагдана
        </p>
        <AboutBrochureForm initial={brochure} />
      </section>
    </div>
  );
}
