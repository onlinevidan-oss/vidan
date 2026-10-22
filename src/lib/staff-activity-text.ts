/**
 * Ажилтны түүхийн хүнд уншигдах тайлбар — цэвэр функц (тестлэгдэнэ).
 */

type ProductFields = {
  name_mn: string;
  price: number;
  old_price: number | null;
  is_active: boolean;
};

const mnt = (n: number | null) =>
  n == null ? "—" : `${Number(n).toLocaleString("en-US")}₮`;

/**
 * Барааны засварт юу өөрчлөгдсөнийг товч бичнэ.
 * Жнь: "Өргөст хэмх 720г — үнэ 6,200₮ → 6,500₮; идэвхгүй болгосон"
 */
export function describeProductChange(before: ProductFields | null, after: ProductFields): string {
  if (!before) return after.name_mn;
  const parts: string[] = [];
  if (before.name_mn !== after.name_mn) parts.push(`нэр «${before.name_mn}» → «${after.name_mn}»`);
  if (Number(before.price) !== Number(after.price)) {
    parts.push(`үнэ ${mnt(before.price)} → ${mnt(after.price)}`);
  }
  if ((before.old_price ?? null) !== (after.old_price ?? null)) {
    parts.push(`хуучин үнэ ${mnt(before.old_price)} → ${mnt(after.old_price)}`);
  }
  if (before.is_active !== after.is_active) {
    parts.push(after.is_active ? "идэвхжүүлсэн" : "идэвхгүй болгосон");
  }
  return parts.length ? `${after.name_mn} — ${parts.join("; ")}` : after.name_mn;
}
