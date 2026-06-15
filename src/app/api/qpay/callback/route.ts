/**
 * QPay callback endpoint
 *  qPay төлбөр төлөгдсөний дараа энэ URL-руу дуудна.
 *  АНХААР: callback-ийг шууд итгэлгүй — /payment/check-ээр баталгаажуулна.
 *
 *  callback_url = {BASE}/api/qpay/callback?order_id={orderId}
 *  qPay GET эсвэл POST-оор дуудаж болох тул хоёуланг нь дэмжинэ.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyAndMarkPaid } from "@/lib/qpay/orders";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json(
      { error: "order_id шаардлагатай" },
      { status: 400 },
    );
  }

  try {
    const status = await verifyAndMarkPaid(orderId);
    if (status === "not_found") {
      return NextResponse.json(
        { error: "Нэхэмжлэл олдсонгүй" },
        { status: 404 },
      );
    }
    // qPay 200 хариу хүлээдэг.
    return NextResponse.json({ ok: true, status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Алдаа";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
