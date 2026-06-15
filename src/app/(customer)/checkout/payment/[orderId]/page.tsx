import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureInvoiceForOrder, type QpayBankUrl } from "@/lib/qpay/orders";
import { QpayPayment } from "@/components/customer/QpayPayment";

export const metadata = { title: "QPay төлбөр | VIDAN" };
export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: PageProps<"/checkout/payment/[orderId]">) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/payment/${orderId}`);

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total, payment_status, payment_method")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  // Аль хэдийн төлөгдсөн бол шууд амжилтын хуудас руу
  if (order.payment_status === "paid") {
    redirect(`/checkout/success/${orderId}`);
  }

  // qPay-аар бус захиалга энд орох ёсгүй
  if (order.payment_method !== "qpay") {
    redirect(`/checkout/success/${orderId}`);
  }

  // Нэхэмжлэл байгаа эсэхийг шалгаад байхгүй бол үүсгэнэ
  let invoiceError: string | null = null;
  let qr_image = "";
  let qr_text = "";
  let urls: QpayBankUrl[] = [];
  let shortUrl: string | null = null;

  try {
    const invoice = await ensureInvoiceForOrder({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total),
    });
    qr_image = invoice.qr_image ?? "";
    qr_text = invoice.qr_text ?? "";
    urls = (invoice.urls as unknown as QpayBankUrl[]) ?? [];
    shortUrl = invoice.qpay_short_url;
  } catch (e) {
    invoiceError =
      e instanceof Error ? e.message : "QPay нэхэмжлэл үүсгэхэд алдаа гарлаа";
  }

  if (invoiceError) {
    return (
      <div className="my-12 grid place-items-center">
        <div className="w-full max-w-[520px] rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center">
          <div className="mb-2 text-4xl">⚠️</div>
          <h1 className="font-display mb-2 text-xl font-extrabold text-brand-700">
            QPay-тэй холбогдоход алдаа гарлаа
          </h1>
          <p className="mb-4 text-sm text-ink-700">{invoiceError}</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-block rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Захиалга руу буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <QpayPayment
      orderId={order.id}
      orderNumber={order.order_number}
      total={Number(order.total)}
      qrImage={qr_image}
      qrText={qr_text}
      shortUrl={shortUrl}
      urls={urls}
    />
  );
}
