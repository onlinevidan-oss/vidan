/**
 * Order status — нэг газар төвлөрүүлсэн constants
 * 5 файлд давтагдсан байсныг энд цуглуулсан
 */

export const ORDER_STATUSES = [
  "new",
  "preparing",
  "shipping",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Захиалгын хэвийн state-машин дараалал */
export const STATUS_FLOW = [
  "new",
  "preparing",
  "shipping",
  "delivered",
] as const;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Шинэ",
  preparing: "Бэлтгэж байна",
  shipping: "Жолоочид",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-[#e8f1fc] text-[#2e7eda]",
  preparing: "bg-lime-100 text-lime-700",
  shipping: "bg-[#ede1f5] text-[#7c3aed]",
  delivered: "bg-[#e3f5ea] text-[#2da764]",
  cancelled: "bg-brand-100 text-brand-700",
};

export const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  new: "Бэлтгэлд оруулах",
  preparing: "Жолоочид өгөх",
  shipping: "Хүргэгдсэн гэж тэмдэглэх",
};

/** Тухайн төлөвөөс шилжих боломжтой дараагийн төлөв */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

/** State-машин: тухайн шилжилт зөвшөөрөгдөх эсэх */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  // Хэвийн зам: new → preparing → shipping → delivered
  const flow = STATUS_FLOW as readonly string[];
  const fromIdx = flow.indexOf(from);
  const toIdx = flow.indexOf(to);

  // Аль ч төлвөөс cancelled-руу шилжиж болно — гэхдээ delivered/cancelled-ээс биш
  if (to === "cancelled") {
    return from !== "delivered" && from !== "cancelled";
  }

  // Шинэ зам: дараагийн алхам биш бол хориглоно
  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx === fromIdx + 1;
}

/** Финал төлөв үү? */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}
