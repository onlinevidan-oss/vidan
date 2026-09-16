/**
 * Богино холбоос: /t/10281 → /checkout/payment/<uuid>
 *
 * ЯАГААД: сануулгын SMS-д захиалгын UUID-тай бүтэн зам орвол
 * `vidan.mn/checkout/payment/9e183490-e4dd-4fc5-8d85-40a7f5f27da4`
 * 62 тэмдэгт болж, кирилл SMS 3 segment (3 дахин төлбөр) болно.
 * `vidan.mn/t/10281` нь 16 тэмдэгт — нэг бүтэн segment хэмнэнэ.
 *
 * Аюулгүй байдал: захиалгын дугаар нууц зүйл биш. Төлбөрийн хуудас
 * өөрөө нэвтрэлт болон эзэмшлийг шалгадаг тул хэн нэгэн бусдын
 * дугаарыг таавал login руу шилжиж, дараа нь 404 харна.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/t/[code]">,
) {
  const { code } = await ctx.params;
  const digits = code.replace(/\D/g, "");
  if (!digits) return NextResponse.redirect(new URL("/", request.url));

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id")
    .eq("order_number", `#${digits}`)
    .maybeSingle();

  if (!order) return NextResponse.redirect(new URL("/", request.url));

  return NextResponse.redirect(
    new URL(`/checkout/payment/${order.id}`, request.url),
  );
}
