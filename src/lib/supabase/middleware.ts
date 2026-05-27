/**
 * Supabase session refresh helper for Next.js middleware
 * - Calls supabase.auth.getUser() to refresh session cookies
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRITICAL: getUser-ыг middleware дотор дуудаж session-ыг шинэчилнэ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /admin/* хуудаснууд хамгаалагдсан — нэвтрээгүй бол /admin/login руу
  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/admin") &&
    path !== "/admin/login" &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
