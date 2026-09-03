/**
 * Next.js 16 Proxy (former "middleware")
 * Refreshes Supabase session cookies + protects /admin/*
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    "/checkout/:path*",
    "/auth/:path*",
  ],
};
