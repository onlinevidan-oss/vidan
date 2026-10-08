import { TopBar } from "@/components/admin/TopBar";
import { PromoManager, type PromoRow } from "@/components/admin/PromoManager";
import { createClient } from "@/lib/supabase/server";
import { ubDateKey } from "@/lib/datetime";
import { promoState } from "@/lib/promo";

export const metadata = { title: "Урамшуулал | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminPromotions() {
  const supabase = await createClient();
  const [{ data: promos }, { data: redemptions }] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, code, name, type, value, min_order, max_discount, segment, starts_at, ends_at, usage_limit, usage_per_user, usage_count, is_active, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("promo_redemptions").select("promo_id, discount"),
  ]);

  const given = new Map<string, number>();
  for (const r of redemptions ?? []) {
    given.set(r.promo_id, (given.get(r.promo_id) ?? 0) + Number(r.discount ?? 0));
  }

  const now = new Date();
  const rows: PromoRow[] = (promos ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    value: Number(p.value),
    min_order: Number(p.min_order ?? 0),
    max_discount: p.max_discount === null ? null : Number(p.max_discount),
    segment: p.segment ?? "all",
    starts_on: ubDateKey(new Date(p.starts_at)),
    ends_on: p.ends_at ? ubDateKey(new Date(p.ends_at)) : "",
    usage_limit: p.usage_limit,
    usage_per_user: p.usage_per_user,
    usage_count: p.usage_count,
    is_active: p.is_active,
    state: promoState(p, now),
    discount_given: given.get(p.id) ?? 0,
  }));

  const live = rows.filter((r) => r.state === "active").length;

  return (
    <>
      <TopBar title="Урамшуулал" crumb="Промо код" />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Промо код
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Нийт <strong className="text-ink-900">{rows.length}</strong> код ·{" "}
            <strong className="text-lime-700">{live}</strong> нь одоо идэвхтэй —
            хэрэглэгч захиалга дээрээ бичихэд хөнгөлөлт авна
          </div>
        </div>

        <PromoManager promos={rows} today={ubDateKey()} />

        <div className="mt-5 rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-700">
          <strong className="text-ink-900">Хэрхэн ажилладаг вэ:</strong> хөнгөлөлт
          <strong> барааны дүнгээс</strong> хасагдана (хүргэлтийн төлбөрөөс
          биш). Нэг захиалгад нэг л код орно. Брэндээр хугацаатай үнэ буулгах
          бол Тохиргоо → Хямдралын кампанит ажлыг ашиглана.
        </div>
      </div>
    </>
  );
}
