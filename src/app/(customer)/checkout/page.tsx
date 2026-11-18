import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutView } from "@/components/customer/CheckoutView";
import { getCommerceSettings } from "@/lib/queries/settings";
import { isEbarimtConfigured } from "@/lib/ebarimt/posapi";
import { isEbarimtEnabled } from "@/lib/qpay/client";
import { getCurrentStaff } from "@/lib/queries/staff";
import { isFruitRole } from "@/lib/staff-rules";
import { getFruitProductIdsPublic, getShippingBoxIdsPublic } from "@/lib/queries/fruit-public";

export const metadata = { title: "Захиалга өгөх", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Заавал нэвтэрсэн байх
  if (!user) redirect("/login?next=/checkout");

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false }),
  ]);

  const [settings, staff, { data: cards }, fruitIds, boxIds] = await Promise.all([
    getCommerceSettings(),
    getCurrentStaff(),
    // QR-аар идэвхжүүлсэн хөнгөлөлтийн карт (0049) — захиалгад өөрөө хасагдана
    supabase.rpc("my_discount_card"),
    getFruitProductIdsPublic(),
    getShippingBoxIdsPublic(),
  ]);
  const card = Array.isArray(cards) ? cards[0] : null;

  return (
    <CheckoutView
      user={{ id: user.id, email: user.email ?? null }}
      profile={profile}
      addresses={addresses ?? []}
      settings={settings}
      // QPay-ийн и-баримт (шинэ) эсвэл PosAPI (хуучин) аль нэг нь идэвхтэй бол
      ebarimtEnabled={isEbarimtEnabled() || isEbarimtConfigured()}
      isStaff={!!staff && !isFruitRole(staff.role)}
      card={card ? { name: card.name, percent: Number(card.percent) } : null}
      fruitIds={fruitIds}
      boxIds={boxIds}
    />
  );
}
