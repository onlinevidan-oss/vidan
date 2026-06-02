/**
 * OAuth callback handler.
 * `next` параметр open redirect-аас сэргийлэхээр зөвхөн internal path
 * (эхэлж "/" гэхдээ "//" биш) зөвшөөрнө.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Аюулгүй internal path эсэхийг шалгана */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  // "//" эсвэл "/\" — protocol-relative redirect-ийг хорино
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
