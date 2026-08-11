/**
 * DEV-ONLY: захиалгыг "төлөгдсөн" болгож e-barimt үүсгэхийг дуурайлгана.
 * Жинхэнэ QPay төлбөргүйгээр createOrderEbarimt-ийг end-to-end шалгах.
 *   GET /api/ebarimt/dev-simulate?orderId=<uuid>
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrderEbarimt } from "@/lib/ebarimt/orders";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "orderId шаардлагатай" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", orderId);

  await createOrderEbarimt(orderId);

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, payment_status, ebarimt_type, ebarimt_consumer_no, ebarimt_customer_tin, ebarimt_id, ebarimt_lottery, ebarimt_date",
    )
    .eq("id", orderId)
    .maybeSingle();

  return NextResponse.json({ order });
}
