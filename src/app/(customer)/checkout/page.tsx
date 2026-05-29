import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutView } from "@/components/customer/CheckoutView";

export const metadata = { title: "Захиалга өгөх | VIDAN" };

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

  return (
    <CheckoutView
      user={{ id: user.id, email: user.email ?? null }}
      profile={profile}
      addresses={addresses ?? []}
    />
  );
}
