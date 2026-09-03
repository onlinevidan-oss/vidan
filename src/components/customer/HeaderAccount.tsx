"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserMenu } from "@/components/customer/UserMenu";

type AccountState = {
  name: string | null;
  phone: string | null;
  isStaff: boolean;
} | null;

export function HeaderAccount() {
  const [account, setAccount] = useState<AccountState>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) {
        if (active) setLoaded(true);
        return;
      }
      const [{ data: profile }, { data: staff }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("staff").select("id").eq("id", user.id).eq("is_active", true).maybeSingle(),
      ]);
      if (active) {
        setAccount({
          name: profile?.full_name ?? null,
          phone: profile?.phone ?? user.phone ?? null,
          isStaff: Boolean(staff),
        });
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  if (!loaded) return <div aria-hidden className="h-10 w-[86px] animate-pulse rounded-lg bg-ink-100" />;
  if (account) return <UserMenu name={account.name} phone={account.phone} isStaff={account.isStaff} />;
  return (
    <Link href="/login" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-700">
      Нэвтрэх
    </Link>
  );
}
