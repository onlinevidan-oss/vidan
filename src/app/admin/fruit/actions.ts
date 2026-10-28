"use server";

/**
 * Vidan fruit-ийн админы үйлдлүүд (0048).
 *
 * Үйлдэл бүр: requireFruitAccess() → тухайн захиалга/бараа ЖИМСНИЙХ
 * эсэхийг шалгана → дараа нь гүйцэтгэнэ. Жимсний ажилтан RLS-ээр VIDAN-ы
 * захиалгад хүрдэггүй тул захиалгын төлөвийг service_role-оор бичнэ —
 * тиймээс дээрх хоёр шалгалт заавал.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFruitAccess } from "@/lib/admin-guard";
import { isFruitOrder, isFruitProduct } from "@/lib/queries/fruit";
import { canTransition, STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { sendCourierEnteredSms } from "@/lib/sms/notifications";
import { logStaffActivity } from "@/lib/staff-activity";
import { isValidDateKey } from "@/lib/report-period";
import { ubDayStart } from "@/lib/datetime";

type Result = { ok: true } | { ok: false; error: string };

/** Жимсний ажилтан зөвхөн урагш шилжүүлнэ — цуцлах нь VIDAN-ы шийдвэр (төлбөр буцаалттай) */
const FRUIT_STATUSES: OrderStatus[] = ["preparing", "shipping", "delivered"];

export async function updateFruitOrderStatus(orderId: string, status: OrderStatus): Promise<Result> {
  const guard = await requireFruitAccess();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!FRUIT_STATUSES.includes(status)) return { ok: false, error: "Энэ төлөвт шилжүүлэх эрхгүй" };
  if (!(await isFruitOrder(orderId))) return { ok: false, error: "Захиалга олдсонгүй" };

  const admin = createAdminClient();
  const { data: cur } = await admin
    .from("orders")
    .select("status, payment_status, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!cur) return { ok: false, error: "Захиалга олдсонгүй" };
  if (cur.payment_status !== "paid") return { ok: false, error: "Төлөгдөөгүй захиалга" };
  if (cur.status === status) return { ok: false, error: "Аль хэдийн ийм төлөвт байна" };
  if (!canTransition(cur.status as OrderStatus, status)) {
    return { ok: false, error: `${STATUS_LABEL[cur.status as OrderStatus] ?? cur.status} → ${STATUS_LABEL[status]} шилжилт зөвшөөрөгдөхгүй` };
  }

  const { error } = await admin
    .from("orders")
    .update({
      status,
      delivered_at: status === "delivered" ? new Date().toISOString() : null,
    })
    .eq("id", orderId)
    .eq("status", cur.status);
  if (error) return { ok: false, error: error.message };

  await admin.from("order_events").insert({
    order_id: orderId,
    event_type: `status_${status}`,
    description: `Төлөв шинэчилэгдсэн: ${status}`,
    created_by: guard.staff.id,
  });
  await logStaffActivity({
    action: "order_status",
    summary: `${cur.order_number} төлөв → ${STATUS_LABEL[status]}`,
    entityType: "order",
    entityId: orderId,
  });

  revalidatePath(`/admin/fruit/orders/${orderId}`);
  revalidatePath("/admin/fruit/orders");
  revalidatePath("/admin/fruit");
  return { ok: true };
}

const ENTER_ERRORS: Record<string, string> = {
  NOT_STAFF: "Хандах эрх алга",
  ORDER_NOT_FOUND: "Захиалга олдсонгүй",
  ORDER_NOT_ACTIVE: "Төлөгдөөгүй эсвэл цуцлагдсан захиалгыг шивэх боломжгүй",
};

/** "Шивсэн" — mark_courier_entered нь жимсний ажилтанд жимсний захиалгыг л зөвшөөрнө */
export async function markFruitCourierEntered(orderId: string): Promise<
  | { ok: true; enteredAt: string; enteredBy: string; already: boolean }
  | { ok: false; error: string }
> {
  const guard = await requireFruitAccess();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!(await isFruitOrder(orderId))) return { ok: false, error: "Захиалга олдсонгүй" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_courier_entered", { p_order_id: orderId });
  if (error) return { ok: false, error: ENTER_ERRORS[error.message] ?? error.message };
  const row = data?.[0];
  if (!row) return { ok: false, error: "Хариу ирсэнгүй" };
  if (row.newly_marked) await sendCourierEnteredSms(orderId, row.entered_by_name);

  revalidatePath(`/admin/fruit/orders/${orderId}`);
  revalidatePath("/admin/fruit/orders");
  return { ok: true, enteredAt: row.entered_at, enteredBy: row.entered_by_name, already: !row.newly_marked };
}

/** Жимсний агуулахын хөдөлгөөн — RPC өөрөө жимсний бараа эсэхийг дахин шалгана */
export async function recordFruitStockMovement(input: {
  productId: string;
  kind: "in" | "out" | "adjust";
  quantity: number;
  date?: string;
  note?: string;
}): Promise<{ ok: true; newStock: number } | { ok: false; error: string }> {
  const guard = await requireFruitAccess();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!(await isFruitProduct(input.productId))) return { ok: false, error: "Жимсний бараа биш" };
  if (!["in", "out", "adjust"].includes(input.kind)) return { ok: false, error: "Хөдөлгөөний төрөл буруу" };

  const qty = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(qty) || qty === 0 || Math.abs(qty) > 100_000) {
    return { ok: false, error: "Тоо ширхэг буруу" };
  }
  const date = input.date?.trim();
  if (date && !isValidDateKey(date)) return { ok: false, error: "Огноо буруу байна" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_stock_movement", {
    p_product_id: input.productId,
    p_kind: input.kind,
    p_qty: qty,
    p_note: input.note?.trim() || undefined,
    p_occurred_at: date ? ubDayStart(date).toISOString() : new Date().toISOString(),
  });
  if (error) {
    return {
      ok: false,
      error: error.message === "INSUFFICIENT_STOCK" ? "Үлдэгдэл сөрөг болно" : error.message,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const newStock = Number(row?.new_stock ?? 0);

  const kindLabel = { in: "Орлого", out: "Зарлага", adjust: "Тооллогын засвар" }[input.kind];
  await logStaffActivity({
    action: "stock_movement",
    summary: `${kindLabel} (жимс): ${input.kind === "out" ? -Math.abs(qty) : qty} ш → үлдэгдэл ${newStock}`,
    entityType: "product",
    entityId: input.productId,
  });

  revalidatePath("/admin/fruit/inventory");
  return { ok: true, newStock };
}

const BUCKET = "products";
const MAX_IMAGE_BYTES = 900 * 1024;

/**
 * Жимсний барааны зураг нэмэх. Браузер зургийг 870×870 болгоод (бусад
 * бараатай ижил) илгээнэ; storage-ийн RLS жимсний ажилтанд бичих эрх
 * өгдөггүй тул серверт эрх, бараа хоёрыг шалгаад service_role-оор хадгална.
 */
export async function uploadFruitProductImage(
  productId: string,
  form: FormData,
): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  const guard = await requireFruitAccess();
  if (!guard.ok) return { ok: false, error: guard.error };
  if (!(await isFruitProduct(productId))) return { ok: false, error: "Жимсний бараа биш" };

  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Зураг сонгоно уу" };
  if (file.type !== "image/jpeg") return { ok: false, error: "Зураг JPEG байх ёстой" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Зураг хэт том байна" };

  const admin = createAdminClient();
  const path = `${productId}/${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: "image/jpeg",
    upsert: false,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

  const { data: maxRow } = await admin
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("product_images")
    .insert({ product_id: productId, url, sort_order: (maxRow?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]);
    return { ok: false, error: error?.message ?? "Зураг бүртгэж чадсангүй" };
  }

  await logStaffActivity({ action: "product_image_add", summary: "Жимсний барааны зураг нэмэв", entityType: "product", entityId: productId });
  revalidatePath("/admin/fruit/settings");
  revalidatePath("/admin/fruit/inventory");
  return { ok: true, id: data.id, url };
}

/** Жимсний барааны зураг устгах — зураг тухайн жимсний бараанх эсэхийг шалгана */
export async function removeFruitProductImage(imageId: string): Promise<Result> {
  const guard = await requireFruitAccess();
  if (!guard.ok) return { ok: false, error: guard.error };

  const admin = createAdminClient();
  const { data: img } = await admin.from("product_images").select("url, product_id").eq("id", imageId).maybeSingle();
  if (!img || !(await isFruitProduct(img.product_id))) return { ok: false, error: "Зураг олдсонгүй" };

  const marker = `/object/public/${BUCKET}/`;
  const at = img.url.indexOf(marker);
  if (at >= 0) await admin.storage.from(BUCKET).remove([img.url.slice(at + marker.length)]);
  const { error } = await admin.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };

  await logStaffActivity({ action: "product_image_remove", summary: "Жимсний барааны зураг устгав", entityType: "product", entityId: img.product_id });
  revalidatePath("/admin/fruit/settings");
  revalidatePath("/admin/fruit/inventory");
  return { ok: true };
}
