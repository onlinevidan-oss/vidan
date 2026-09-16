"use client";

/**
 * Ажилтны браузерийг хэмжилтээс хасна.
 *
 * Зөвхөн админы layout дотор ачаалагддаг — тэр layout руу ажилтан л
 * орж чадна (бусад нь /admin/forbidden руу шилжинэ). Тиймээс энэ
 * тэмдэглэгээ тавигдсан браузер бол ажилтных гэдэг нь баталгаатай.
 *
 * Хаана хадгалах вэ: localStorage. Күүки биш — сервер рүү явуулах
 * шаардлагагүй, зөвхөн браузерт GA ачаалахыг зогсооход хэрэгтэй.
 *
 * Буцаах: дэлгүүрийн хаягт `?track=1` нэмэх.
 */

import { useEffect } from "react";
import { NO_TRACK_KEY } from "@/lib/analytics";

export function StaffNoTrack() {
  useEffect(() => {
    try {
      localStorage.setItem(NO_TRACK_KEY, "1");
    } catch {
      // Хаалттай бол өнгөрнө — админы ажлыг тасалдуулах зүйл биш.
    }
  }, []);
  return null;
}
