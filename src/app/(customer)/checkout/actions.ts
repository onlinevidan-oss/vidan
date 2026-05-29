"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const FREE_SHIPPING_MIN = 50000;
const TAX_RATE = 0.1;

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

export async function placeOrder(
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Нэвтэрнэ үү" };
  if (!payload.items.length) return { ok: false, error: "Сагс хоосон байна" };

  // 1) Барааны мэдээллийг DB-ээс баталгаажуулна (үнэ, нөөц)
  const productIds = payload.items.map((i) => i.productId);
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, sku, name_mn, price, stock")
    .in("id", productIds);

  if (prodErr || !products || products.length !== productIds.length) {
    return { ok: false, error: "Зарим бараа олдсонгүй" };
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 2) Stock check
  for (const item of payload.items) {
    const p = productMap.get(item.productId);
    if (!p) return { ok: false, error: `Бараа олдсонгүй: ${item.productId}` };
    if (p.stock < item.quantity) {
      return {
        ok: false,
        error: `${p.name_mn}: зөвхөн ${p.stock} ширхэг үлдсэн`,
      };
    }
  }

  // 3) Шинэ хаяг бол үүсгэх
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
    if (addrErr || !addr) return { ok: false, error: "Хаяг хадгалж чадсангүй" };
    addressId = addr.id;
  }

  if (!addressId) return { ok: false, error: "Хүргэх хаяг оруулна уу" };

  // 4) Үнэ тооцоолох
  const subtotal = payload.items.reduce(
    (s, i) => s + (productMap.get(i.productId)?.price ?? 0) * i.quantity,
    0,
  );
  const shipping = subtotal >= FREE_SHIPPING_MIN ? 0 : 5000;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  // 5) Order үүсгэх
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      address_id: addressId,
      status: "new",
      payment_method: payload.paymentMethod,
      payment_status: payload.paymentMethod === "cash" ? "pending" : "pending",
      subtotal,
      discount: 0,
      shipping,
      tax,
      total,
      driver_notes: payload.driverNotes ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message || "Захиалга үүсгэж чадсангүй" };
  }

  // 6) Order items
  const orderItems = payload.items.map((i) => {
    const p = productMap.get(i.productId)!;
    return {
      order_id: order.id,
      product_id: p.id,
      product_name: p.name_mn,
      product_sku: p.sku,
      quantity: i.quantity,
      unit_price: p.price,
      subtotal: p.price * i.quantity,
    };
  });

  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) {
    // Order үүссэн ч items нэмэх алдаа гарвал rollback хэрэгтэй
    // Production-д transaction ашиглах ёстой; одоо log хийнэ
    console.error("order_items insert failed:", itemsErr);
    return { ok: false, error: "Барааны мэдээлэл хадгалах үед алдаа" };
  }

  // 7) Stock хорогдуулах (RPC-ээр атомичаар хийх нь зөв; одоо UPDATE)
  for (const item of payload.items) {
    const p = productMap.get(item.productId)!;
    await supabase
      .from("products")
      .update({ stock: p.stock - item.quantity })
      .eq("id", item.productId);
  }

  // 8) Order timeline event
  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "created",
    description: "Захиалга үүссэн",
    created_by: user.id,
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return { ok: true, orderId: order.id, orderNumber: order.order_number };
}

export async function redirectToSuccess(orderId: string): Promise<never> {
  redirect(`/checkout/success/${orderId}`);
}
