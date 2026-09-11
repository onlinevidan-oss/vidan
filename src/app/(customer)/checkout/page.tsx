import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutView } from "@/components/customer/CheckoutView";
import { getCommerceSettings } from "@/lib/queries/settings";
import { isEbarimtConfigured } from "@/lib/ebarimt/posapi";
import { isEbarimtEnabled } from "@/lib/qpay/client";
import { getCurrentStaff } from "@/lib/queries/staff";

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

  const [settings, staff] = await Promise.all([
    getCommerceSettings(),
    getCurrentStaff(),
  ]);

  return (
    <CheckoutView
      user={{ id: user.id, email: user.email ?? null }}
      profile={profile}
      addresses={addresses ?? []}
      settings={settings}
      // QPay-ийн и-баримт (шинэ) эсвэл PosAPI (хуучин) аль нэг нь идэвхтэй бол
      ebarimtEnabled={isEbarimtEnabled() || isEbarimtConfigured()}
      isStaff={!!staff}
    />
  );
}
