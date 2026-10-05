/**
 * Админд мэдэгдэл хүлээн авах утасны жагсаалтыг задлах — цэвэр функц.
 *
 * Тохиргоонд нэг мөр текстээр хадгална ("94070800, 80012476"). Буруу
 * бичсэн дугаарыг чимээгүй хаявал админ мэдэгдэл ирэхгүй байгааг
 * анзаарахгүй тул хүчингүйг тусад нь буцааж, хадгалах үед хэлнэ.
 *
 * `client.ts` нь server-only тул тестлэгдэхийн тулд тусдаа файлд байна.
 */

/** Монгол гар утас: 8 орон, 6-9-өөр эхэлнэ */
const MN_MOBILE = /^[6-9]\d{7}$/;

export function parseRecipients(raw: string | null | undefined): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const part of (raw ?? "").split(/[,;\n]+/)) {
    const token = part.trim();
    if (!token) continue;

    let digits = token.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("976")) {
      digits = digits.slice(3);
    }

    if (!MN_MOBILE.test(digits)) invalid.push(token);
    else if (!valid.includes(digits)) valid.push(digits);
  }

  return { valid, invalid };
}
