import { TopBar } from "@/components/admin/TopBar";
import { PromoManager, type PromoRow } from "@/components/admin/PromoManager";
import { createClient } from "@/lib/supabase/server";
import { ubDateKey } from "@/lib/datetime";
import { promoState } from "@/lib/promo";
import { VoucherManager, type VoucherRow } from "@/components/admin/VoucherManager";
import { voucherBalance, voucherState } from "@/lib/gift-voucher";

export const metadata = { title: "Урамшуулал | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

export default async function AdminPromotions() {
  const supabase = await createClient();
  const [
    { data: promos },
    { data: redemptions },
    { data: claims },
    { data: vouchers },
    { data: voucherUses },
  ] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, code, name, type, value, min_order, max_discount, segment, starts_at, ends_at, usage_limit, usage_per_user, usage_count, is_active, kind, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("promo_redemptions").select("promo_id, discount"),
    supabase.from("discount_card_claims").select("promo_id"),
    supabase
      .from("gift_vouchers")
      .select("id, code, amount, ends_at, is_active, note, user_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("gift_voucher_uses")
      .select("voucher_id, order_id, amount, created_at")
      .order("created_at", { ascending: true }),
  ]);

  // Эрхийн бичгийн хэрэглээний захиалга ба эзэмшигч
  const useOrderIds = [...new Set((voucherUses ?? []).map((u) => u.order_id))];
  const ownerIds = [...new Set((vouchers ?? []).map((v) => v.user_id).filter(Boolean))] as string[];
  const [{ data: useOrders }, { data: owners }] = await Promise.all([
    useOrderIds.length
      ? supabase.from("orders").select("id, order_number, status").in("id", useOrderIds)
      : Promise.resolve({ data: [] as { id: string; order_number: string; status: string }[] }),
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name, phone").in("id", ownerIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; phone: string | null }[] }),
  ]);
  const orderById = new Map((useOrders ?? []).map((o) => [o.id, o]));
  const ownerById = new Map((owners ?? []).map((p) => [p.id, p]));

  const claimedBy = new Map<string, number>();
  for (const c of claims ?? []) {
    claimedBy.set(c.promo_id, (claimedBy.get(c.promo_id) ?? 0) + 1);
  }

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
    kind: p.kind ?? "code",
    claimed: claimedBy.get(p.id) ?? 0,
  }));

  const live = rows.filter((r) => r.state === "active").length;

  const voucherRows: VoucherRow[] = (vouchers ?? []).map((v) => {
    const uses = (voucherUses ?? [])
      .filter((u) => u.voucher_id === v.id)
      .map((u) => {
        const o = orderById.get(u.order_id);
        return {
          order_id: u.order_id,
          order_number: o?.order_number ?? "—",
          amount: Number(u.amount),
          cancelled: o?.status === "cancelled",
          date: ubDateKey(new Date(u.created_at)).replaceAll("-", "."),
        };
      });
    const balance = voucherBalance(Number(v.amount), uses);
    const owner = v.user_id ? ownerById.get(v.user_id) : undefined;
    return {
      id: v.id,
      code: v.code,
      amount: Number(v.amount),
      balance,
      ends_on: v.ends_at ? ubDateKey(new Date(v.ends_at)) : "",
      is_active: v.is_active,
      state: voucherState({ is_active: v.is_active, ends_at: v.ends_at, balance }, now),
      note: v.note,
      owner: v.user_id
        ? { id: v.user_id, name: owner?.full_name ?? null, phone: owner?.phone ?? null }
        : null,
      uses,
    };
  });

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
          биш). Нэг захиалгад нэг л код орно; QR картын хөнгөлөлт түүн дээр
          давхар хасагдана. Брэндээр хугацаатай үнэ буулгах
          бол Тохиргоо → Хямдралын кампанит ажлыг ашиглана.
        </div>

        <div className="mb-4 mt-10">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
            Эрхийн бичиг
          </h2>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Тодорхой дүнгийн худалдан авалтын эрх — хүргэлтийн төлбөр орно, хэд хуваан
            ашиглана, үлдэгдэл хадгалагдана
          </div>
        </div>
        <VoucherManager vouchers={voucherRows} today={ubDateKey()} />

      </div>
    </>
  );
}
