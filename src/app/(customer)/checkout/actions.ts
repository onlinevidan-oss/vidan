"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckoutPayload = {
  items: { productId: string; quantity: number }[];
  addressId?: string;
  newAddress?: {
    label: string;
    district: string;
    khoroo: string;
    detail: string;
  };
  paymentMethod: "qpay" | "card" | "cash";
  driverNotes?: string;
};

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

/** Postgres `place_order` RPC-ээс ирэх алдааг хэрэглэгчийн ойлгомжтой текст рүү хөрвүүлэх */
function translateError(message: string): string {
  if (message.includes("AUTH_REQUIRED")) return "Нэвтрэх шаардлагатай";
  if (message.includes("EMPTY_CART")) return "Сагс хоосон байна";
  if (message.includes("INVALID_ADDRESS")) return "Хүргэх хаяг буруу байна";
  if (message.includes("INVALID_PAYMENT_METHOD")) return "Төлбөрийн арга буруу";
  if (message.includes("INVALID_QUANTITY")) return "Барааны тоо буруу";
  if (message.includes("INSUFFICIENT_STOCK")) {
    return "Зарим бараа дутагдалтай — сагсаа шинэчилнэ үү";
  }
  return message;
}

export async function placeOrder(
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Нэвтэрнэ үү" };
  if (!payload.items.length) return { ok: false, error: "Сагс хоосон байна" };

  // 1) Шинэ хаяг бол үүсгэх (энэ нь RLS-аар self-only)
  let addressId = payload.addressId;
  if (!addressId && payload.newAddress) {
    const { data: addr, error: addrErr } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        label: payload.newAddress.label || "Гэр",
        district: payload.newAddress.district,
        khoroo: payload.newAddress.khoroo,
        detail: payload.newAddress.detail,
      })
      .select("id")
      .single();
    if (addrErr || !addr) {
      return { ok: false, error: "Хаяг хадгалж чадсангүй" };
    }
    addressId = addr.id;
  }

  if (!addressId) return { ok: false, error: "Хүргэх хаяг оруулна уу" };

  // 2) Атомик RPC дуудах — stock check + decrement + order + items + event
  //    Бүгд нэг Postgres transaction-д явна. Алдвал бүх өөрчлөлт rollback болно.
  const { data, error } = await supabase.rpc("place_order", {
    p_address_id: addressId,
    p_payment_method: payload.paymentMethod,
    p_items: payload.items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
    })),
    p_driver_notes: payload.driverNotes,
    p_promo_code: undefined,
  });

  if (error) {
    return { ok: false, error: translateError(error.message) };
  }

  // RPC `returns table(...)` буцаах учир data нь массив
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.order_id) {
    return { ok: false, error: "Захиалга үүсгэж чадсангүй" };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return {
    ok: true,
    orderId: row.order_id,
    orderNumber: row.order_number,
  };
}
