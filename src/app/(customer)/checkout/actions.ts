"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommerceSettings } from "@/lib/queries/settings";
import { formatMnt } from "@/lib/utils";
import { normalizePhone } from "@/lib/sms/client";

export type CheckoutPayload = {
  items: { productId: string; quantity: number }[];
  /** Хүргэлтийн үндсэн холбоо барих утас (заавал) */
  contactPhone: string;
  /** Нэмэлт утас (сонголтоор) */
  contactPhone2?: string;
  addressId?: string;
  newAddress?: {
    label: string;
    district: string;
    khoroo: string;
    detail: string;
  };
  paymentMethod: "qpay" | "card" | "cash";
  driverNotes?: string;
  /** Баримт — хувь хүн (B2C) / байгууллага (B2B) */
  ebarimtType?: "B2C_RECEIPT" | "B2B_RECEIPT";
  ebarimtConsumerNo?: string; // B2C: иргэний ebarimt дугаар (заавал биш)
  ebarimtCustomerTin?: string; // B2B: байгууллагын ТТД (заавал)
};

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

/**
 * Postgres `place_order` RPC-ээс ирэх алдааг хэрэглэгчийн ойлгомжтой текст рүү хөрвүүлэх.
 * minOrder-ийг админы тохиргооноос дамжуулна (hardcode хийвэл тохиргоо
 * өөрчлөгдөхөд алдааны текст худал болно).
 */
function translateError(message: string, minOrder: number): string {
  if (message.includes("AUTH_REQUIRED")) return "Нэвтрэх шаардлагатай";
  if (message.includes("EMPTY_CART")) return "Сагс хоосон байна";
  if (message.includes("INVALID_ADDRESS")) return "Хүргэх хаяг буруу байна";
  if (message.includes("INVALID_PAYMENT_METHOD")) return "Төлбөрийн арга буруу";
  if (message.includes("INVALID_QUANTITY")) return "Барааны тоо буруу";
  if (message.includes("MIN_ORDER_NOT_MET")) {
    return `Захиалгын барааны доод дүн ${formatMnt(minOrder)} (хүргэлт, НӨАТ ороогүй) — сагсандаа бараа нэмнэ үү`;
  }
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

  // Хүргэлтийн утас — захиалга үүсгэхээс ӨМНӨ шалгана. Имэйлээр нэвтэрсэн
  // хэрэглэгчид профайлд утас байхгүй тул энэ шалгалтгүй бол хүргэх
  // боломжгүй захиалга үүснэ.
  const contactPhone = normalizePhone(payload.contactPhone);
  if (!contactPhone) {
    return { ok: false, error: "Холбоо барих утасны дугаараа зөв оруулна уу" };
  }
  const contactPhone2 = normalizePhone(payload.contactPhone2) || null;
  if (payload.contactPhone2?.trim() && !contactPhone2) {
    return { ok: false, error: "Нэмэлт утасны дугаар буруу байна" };
  }

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
    const { min_order_amount } = await getCommerceSettings();
    return { ok: false, error: translateError(error.message, min_order_amount) };
  }

  // RPC `returns table(...)` буцаах учир data нь массив
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.order_id) {
    return { ok: false, error: "Захиалга үүсгэж чадсангүй" };
  }

  // E-barimt баримтын мэдээлэл хадгалах (place_order-г өөрчлөхгүйн тулд тусад нь).
  // Захиалга дөнгөж энэ хэрэглэгчийнхээр үүссэн тул admin client-ээр шинэчилнэ.
  const ebarimtType = payload.ebarimtType ?? "B2C_RECEIPT";
  try {
    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({
        contact_phone: contactPhone,
        contact_phone2: contactPhone2,
        ebarimt_type: ebarimtType,
        ebarimt_consumer_no:
          ebarimtType === "B2C_RECEIPT"
            ? payload.ebarimtConsumerNo?.trim() || null
            : null,
        ebarimt_customer_tin:
          ebarimtType === "B2B_RECEIPT"
            ? payload.ebarimtCustomerTin?.trim() || null
            : null,
      })
      .eq("id", row.order_id);
  } catch (e) {
    // Баримтын мэдээлэл хадгалахад алдвал захиалгыг таслахгүй.
    console.error("[order contact/ebarimt info save failed]", e);
  }

  // Профайлд утас байхгүй бол (имэйлээр нэвтэрсэн) нөхөж хадгална —
  // дараагийн захиалгад автоматаар бөглөгдөнө, SMS мэдэгдэл ажиллана.
  try {
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    if (!prof?.phone) {
      await admin
        .from("profiles")
        .update({ phone: contactPhone })
        .eq("id", user.id);
    }
  } catch (e) {
    console.error("[profile phone backfill failed]", e);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return {
    ok: true,
    orderId: row.order_id,
    orderNumber: row.order_number,
  };
}
