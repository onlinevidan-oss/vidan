"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/admin-guard";
import { safeSearchTerm, searchDigits } from "@/lib/order-list";

export type AdminSearchResult = {
  orders: {
    id: string;
    number: string;
    total: number;
    status: string;
    paid: boolean;
    phone: string | null;
  }[];
  products: { id: string; name: string; sku: string; stock: number; active: boolean }[];
  customers: { id: string; name: string | null; phone: string | null }[];
};

const EMPTY: AdminSearchResult = { orders: [], products: [], customers: [] };
const LIMIT = 5;

/**
 * Дээд мөрний "Бүгдийг хайх" — захиалга, бараа, хэрэглэгчээс зэрэг хайна.
 * Захиалга: дугаар, утас · Бараа: нэр, SKU · Хэрэглэгч: нэр, утас, имэйл.
 */
export async function adminSearch(raw: string): Promise<AdminSearchResult> {
  const guard = await requireStaff();
  if (!guard.ok) return EMPTY;

  const term = String(raw ?? "").trim().slice(0, 60);
  const text = safeSearchTerm(term);
  const digits = searchDigits(term);
  if (text.length < 2 && digits.length < 2) return EMPTY;

  const supabase = await createClient();

  const ordersQ =
    digits.length >= 2
      ? supabase
          .from("orders")
          .select("id, order_number, total, status, payment_status, contact_phone")
          .or(`order_number.ilike.%${digits}%,contact_phone.ilike.%${digits}%`)
          .order("created_at", { ascending: false })
          .limit(LIMIT)
      : null;

  const productsQ =
    text.length >= 2
      ? supabase
          .from("products")
          .select("id, name_mn, sku, stock, is_active")
          .or(`name_mn.ilike.%${text}%,sku.ilike.%${text}%`)
          .order("is_active", { ascending: false })
          .limit(LIMIT)
      : null;

  const people: string[] = [];
  if (text.length >= 2) people.push(`full_name.ilike.%${text}%`, `email.ilike.%${text}%`);
  if (digits.length >= 3) people.push(`phone.ilike.%${digits}%`);
  const customersQ =
    people.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, phone")
          .or(people.join(","))
          .order("total_spent", { ascending: false })
          .limit(LIMIT)
      : null;

  const [orders, products, customers] = await Promise.all([
    ordersQ,
    productsQ,
    customersQ,
  ]);

  return {
    orders: (orders?.data ?? []).map((o) => ({
      id: o.id,
      number: o.order_number,
      total: Number(o.total ?? 0),
      status: o.status,
      paid: o.payment_status === "paid",
      phone: o.contact_phone,
    })),
    products: (products?.data ?? []).map((p) => ({
      id: p.id,
      name: p.name_mn,
      sku: p.sku,
      stock: p.stock,
      active: p.is_active,
    })),
    customers: (customers?.data ?? []).map((c) => ({
      id: c.id,
      name: c.full_name,
      phone: c.phone,
    })),
  };
}
