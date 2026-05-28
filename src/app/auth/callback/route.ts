/**
 * OAuth callback handler.
 * Supabase OAuth провайдер (Google гэх мэт) -ээс ирсэн `code`-ыг
 * session болгож, redirect хийнэ.
 *
 * URL: https://yoursite.com/auth/callback?code=...&next=...
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Vercel-д ажиллах үед load balancer header-ыг хүндэтгэх
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

  // Алдаа гарвал login руу буцаах
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
