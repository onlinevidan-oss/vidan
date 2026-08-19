/**
 * Бүтээгдэхүүний тайлбар зэрэг талбарт HTML таг холилдож ирдэг
 * (Freshpack-аас импортолсон өгөгдөл `<p>…</p>`-тэй). React таг агуулсан
 * мөрийг цэвэр текст болгож харуулдаггүй тул энд цэвэрлэнэ.
 *
 * dangerouslySetInnerHTML ашиглахгүй — өгөгдөл гуравдагч эх сурвалжаас
 * ирсэн тул тагийг үзүүлэхийн оронд бүрмөсөн зайлуулна.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** HTML-ийг цэвэр текст болгоно (догол мөрийг хадгална) */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
