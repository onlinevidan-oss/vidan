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

/** Утасны дугаар format: +976 9911 2233 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) {
    return `+976 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return phone;
}
