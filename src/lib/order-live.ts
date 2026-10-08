/**
 * Realtime-аар ирсэн захиалгын өөрчлөлтийг тайлбарлах — цэвэр функц.
 */

type PaymentState = { payment_status?: string | null };

/**
 * Захиалга ЯГ ОДОО төлөгдсөн үү? — "шинэ захиалга" мэдэгдэл гаргах эсэх.
 *
 * Supabase Realtime нь RLS-тэй хүснэгтийн `old` мөрийг зөвхөн id-тайгаар
 * илгээж болдог. Тэр үед өмнөх төлөв мэдэгдэхгүй тул зөвхөн `new`-д
 * найдвал төлөгдсөн захиалгын ТӨЛӨВ солигдох бүрд (бэлтгэж байна →
 * жолоочид …) "шинэ захиалга" гэж худал дохио өгнө. Иймээс:
 *
 *  · `old`-д төлбөрийн төлөв байвал түүгээр шийднэ;
 *  · байхгүй бол тухайн захиалгыг өмнө нь "төлбөр хүлээж буй" гэж
 *    мэдэж байсан эсэхээр (`wasPending`) шийднэ.
 */
export function becamePaid(
  now: PaymentState,
  old: PaymentState | null | undefined,
  wasPending: boolean,
): boolean {
  if (now.payment_status !== "paid") return false;
  if (old?.payment_status != null) return old.payment_status !== "paid";
  return wasPending;
}
