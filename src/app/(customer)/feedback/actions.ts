"use server";

import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["suggestion", "complaint", "praise", "other"] as const;
type Category = (typeof CATEGORIES)[number];

export type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitFeedback(payload: {
  name?: string;
  phone?: string;
  category: string;
  message: string;
}): Promise<FeedbackResult> {
  const message = payload.message?.trim();
  if (!message || message.length < 5) {
    return { ok: false, error: "Саналаа дэлгэрэнгүй бичнэ үү (доод тал нь 5 тэмдэгт)" };
  }
  if (message.length > 2000) {
    return { ok: false, error: "Санал хэт урт байна (2000 тэмдэгт хүртэл)" };
  }

  const category: Category = CATEGORIES.includes(payload.category as Category)
    ? (payload.category as Category)
    : "suggestion";

  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({
    name: payload.name?.trim() || null,
    phone: payload.phone?.trim() || null,
    category,
    message,
  });

  if (error) return { ok: false, error: "Илгээхэд алдаа гарлаа. Дахин оролдоно уу." };
  return { ok: true };
}
