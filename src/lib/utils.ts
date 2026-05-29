import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class-уудыг ухаалгаар нэгтгэх (conflict шийдэгдсэн) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Mongolian төгрөгийн format: ₮47,500 */
export function formatMnt(amount: number): string {
  return `₮${amount.toLocaleString("mn-MN")}`;
}

/**
 * Mongolian Cyrillic → Latin transliteration + URL slug helper.
 * Жнь: "Даршилсан өргөст хэмх" → "darshilsan-orgost-khemkh"
 */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "ye", ё: "yo",
  ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")     // зөвхөн latin, тоо, зай, dash
    .replace(/\s+/g, "-")             // зай → dash
    .replace(/-+/g, "-")              // олон dash → нэг
    .replace(/^-+|-+$/g, "");         // эхэн/төгсгөлийн dash хасах
}

/** Утасны дугаар format: +976 9911 2233 (8 эсвэл 11 оронтой орох боломжтой) */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 8 оронтой Mongolian → +976 нэмж форматлана
  if (digits.length === 8) {
    return `+976 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  // 11 оронтой (976 + 8) → Supabase-ийн хадгалалтын формат
  if (digits.length === 11 && digits.startsWith("976")) {
    const local = digits.slice(3);
    return `+976 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return phone;
}
