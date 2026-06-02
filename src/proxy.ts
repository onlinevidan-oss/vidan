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
     * Зөвхөн Next.js дотоод asset path-уудыг exclude хийнэ.
     * (Өмнө `*.png/.svg/...` файлын өргөтгөл exclude хийгддэг байсан нь
     * `/admin/foo.png` гэх мэт path-аар matcher-ыг гүйцэлгэхгүй авч
     * болохуйц аюулгүй байдлын асуудал үүсгэж байсан)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
