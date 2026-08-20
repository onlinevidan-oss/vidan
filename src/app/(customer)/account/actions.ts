"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/sms/client";

export type ProfilePayload = {
  first_name: string;
  last_name: string;
  gender: "male" | "female" | "";
  email: string;
  phone: string;
  /** yyyy-mm-dd. Нэг удаа хадгалсны дараа өөрчлөгдөхгүй */
  birth_date: string;
  avatar_url: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Зөвхөн өөрийн Supabase storage-ийн зураг зөвшөөрнө */
function isOwnAvatarUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!base && url.startsWith(`${base}/storage/v1/object/public/avatars/`);
}

export async function updateProfile(
  payload: ProfilePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Нэвтэрнэ үү" };

  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  if (!firstName) return { ok: false, error: "Нэрээ оруулна уу" };

  const email = payload.email.trim();
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: "Имэйл хаяг буруу байна" };
  }

  const phone = payload.phone.trim() ? normalizePhone(payload.phone) : null;
  if (payload.phone.trim() && !phone) {
    return { ok: false, error: "Утасны дугаар буруу байна (8 орон)" };
  }

  if (payload.gender && !["male", "female"].includes(payload.gender)) {
    return { ok: false, error: "Хүйс буруу байна" };
  }

  const avatarUrl = payload.avatar_url?.trim() || null;
  if (avatarUrl && !isOwnAvatarUrl(avatarUrl)) {
    return { ok: false, error: "Зургийн URL зөвшөөрөгдөхгүй" };
  }

  // Төрсөн огноо — нэг л удаа бөглөнө. Урамшуулал авахын тулд дахин дахин
  // өөрчлөхөөс сэргийлнэ (өөрчлөх бол ажилтан админаас засна).
  const { data: current } = await supabase
    .from("profiles")
    .select("birth_date")
    .eq("id", user.id)
    .maybeSingle();

  let birthDate = current?.birth_date ?? null;
  if (!birthDate && payload.birth_date) {
    const d = new Date(payload.birth_date);
    const year = d.getFullYear();
    if (Number.isNaN(d.getTime()) || year < 1900 || d > new Date()) {
      return { ok: false, error: "Төрсөн огноо буруу байна" };
    }
    birthDate = payload.birth_date;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName || null,
      // full_name-ийг админ, checkout, захиалгын жагсаалт уншдаг тул синхрон байлгана
      full_name: [lastName, firstName].filter(Boolean).join(" "),
      gender: payload.gender || null,
      email: email || null,
      phone: phone,
      birth_date: birthDate,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/account");
  return { ok: true };
}
