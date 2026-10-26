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

/**
 * Масс SMS-ийн хүлээн авагчид — бүртгэлтэй хэрэглэгчдийн утас (0047).
 * Ажилтныг хасна, давхардлыг арилгана, зөвхөн Монгол гар утас.
 */
export function broadcastRecipients(
  profiles: { id: string; phone: string | null }[],
  staffIds: Set<string>,
): string[] {
  const out = new Set<string>();
  for (const p of profiles) {
    if (staffIds.has(p.id) || !p.phone) continue;
    const { valid } = parseRecipients(p.phone);
    if (valid.length === 1) out.add(valid[0]);
  }
  return [...out];
}

/**
 * Кирилл SMS-ийн хэсгийн тоо. CallPro төгсгөлд " VIDAN" (6 тэмдэгт)
 * залгадаг. Нэг хэсэг 70, олон хэсэгтэй бол хэсэг бүр 67 тэмдэгт.
 */
export function smsSegments(text: string): number {
  const n = text.length + 6;
  return n <= 70 ? 1 : Math.ceil(n / 67);
}
