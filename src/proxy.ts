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
    /*
     * Дараахаас бусад бүх замд ажиллана:
     * - _next/static (статик файл)
     * - _next/image  (image optimization)
     * - favicon, image-ууд
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
