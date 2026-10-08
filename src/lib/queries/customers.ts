/**
 * Хэрэглэгчийн жагсаалт ба дэлгэрэнгүй (админ, server-side).
 */
import { createClient } from "@/lib/supabase/server";
import { startOfMonthMongolia } from "@/lib/datetime";
import { safeSearchTerm, searchDigits } from "@/lib/order-list";

export const CUSTOMERS_PAGE_SIZE = 30;

export const CUSTOMER_SORTS = ["newest", "spent", "orders"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const SEGMENT_LABEL: Record<string, string> = {
  new: "Шинэ",
  active: "Идэвхтэй",
  vip: "VIP",
  inactive: "Идэвхгүй",
};

export type CustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  segment: string;
  /** Хүргэгдсэн захиалгын тоо, дүн (profiles дээр trigger-ээр хөтлөгддөг) */
  total_orders: number;
  total_spent: number;
  created_at: string;
  /** Сүүлийн төлөгдсөн захиалгын огноо */
  last_order_at: string | null;
};

const PROFILE_COLUMNS =
  "id, full_name, phone, email, segment, total_orders, total_spent, created_at";

export async function getCustomersPage(opts: {
  search?: string;
  sort: CustomerSort;
  page: number;
}): Promise<{ rows: CustomerRow[]; total: number; pages: number }> {
  const supabase = await createClient();
  let q = supabase.from("profiles").select(PROFILE_COLUMNS, { count: "exact" });

  if (opts.search) {
    const digits = searchDigits(opts.search);
    const text = safeSearchTerm(opts.search);
    const ors: string[] = [];
    if (text) ors.push(`full_name.ilike.%${text}%`, `email.ilike.%${text}%`);
    if (digits) ors.push(`phone.ilike.%${digits}%`);
    if (ors.length > 0) q = q.or(ors.join(","));
  }

  if (opts.sort === "spent") q = q.order("total_spent", { ascending: false });
  if (opts.sort === "orders") q = q.order("total_orders", { ascending: false });
  q = q.order("created_at", { ascending: false });

  const offset = (opts.page - 1) * CUSTOMERS_PAGE_SIZE;
  const { data, count } = await q.range(offset, offset + CUSTOMERS_PAGE_SIZE - 1);
  const profiles = data ?? [];

  // Энэ хуудасны хэрэглэгчдийн сүүлийн төлөгдсөн захиалга
  const last = new Map<string, string>();
  if (profiles.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("user_id, created_at")
      .in("user_id", profiles.map((p) => p.id))
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });
    for (const o of orders ?? []) {
      if (o.user_id && !last.has(o.user_id)) last.set(o.user_id, o.created_at);
    }
  }

  const total = count ?? 0;
  return {
    rows: profiles.map((p) => ({
      ...p,
      total_orders: Number(p.total_orders ?? 0),
      total_spent: Number(p.total_spent ?? 0),
      last_order_at: last.get(p.id) ?? null,
    })),
    total,
    pages: Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE)),
  };
}

export async function getCustomerStats(): Promise<{
  total: number;
  buyers: number;
  newThisMonth: number;
}> {
  const supabase = await createClient();
  const head = () => supabase.from("profiles").select("id", { count: "exact", head: true });
  const [{ count: total }, { count: buyers }, { count: fresh }] = await Promise.all([
    head(),
    head().gt("total_orders", 0),
    head().gte("created_at", startOfMonthMongolia().toISOString()),
  ]);
  return { total: total ?? 0, buyers: buyers ?? 0, newThisMonth: fresh ?? 0 };
}

export type CustomerAddress = {
  id: string;
  label: string | null;
  district: string | null;
  khoroo: string | null;
  detail: string | null;
};

export async function getCustomer(id: string): Promise<{
  profile: Omit<CustomerRow, "last_order_at">;
  addresses: CustomerAddress[];
} | null> {
  const supabase = await createClient();
  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("addresses")
      .select("id, label, district, khoroo, detail")
      .eq("user_id", id),
  ]);
  if (!profile) return null;
  return {
    profile: {
      ...profile,
      total_orders: Number(profile.total_orders ?? 0),
      total_spent: Number(profile.total_spent ?? 0),
    },
    addresses: addresses ?? [],
  };
}
