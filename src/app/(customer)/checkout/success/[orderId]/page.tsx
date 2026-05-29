import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMnt } from "@/lib/utils";

export const metadata = { title: "Захиалга баталгаажлаа | VIDAN" };
export const dynamic = "force-dynamic";

export default async function OrderSuccessPage({
  params,
}: PageProps<"/checkout/success/[orderId]">) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(quantity, product_name, unit_price, subtotal)")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!order) notFound();

  return (
    <div className="my-10 grid place-items-center">
      <div className="w-full max-w-[640px] rounded-2xl border border-ink-200 bg-white p-10 shadow-[var(--shadow-brand-md)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border-[3px] border-lime-500 bg-lime-100 text-5xl text-lime-700">
            ✓
          </div>
          <h1 className="font-display mb-2 text-3xl font-black tracking-tight text-ink-900">
            Захиалга амжилттай үүслээ!
          </h1>
          <p className="text-sm text-ink-700">
            Бид таны захиалгыг хүлээж авлаа. Бэлтгэн хүргэлтэд өгөх болно.
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-cream p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Захиалгын дугаар
          </div>
          <div className="font-display mt-1 text-2xl font-black text-brand-700">
            {order.order_number}
          </div>
        </div>

        <div className="mb-6 space-y-2">
          {(order.items as { quantity: number; product_name: string; subtotal: number }[]).map(
            (i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-ink-700">
                  {i.product_name} × {i.quantity}
                </span>
                <span className="font-bold text-ink-900">
                  {formatMnt(Number(i.subtotal))}
                </span>
              </div>
            ),
          )}
          <div className="my-2 h-px bg-ink-100" />
          <div className="flex justify-between">
            <span className="font-bold text-ink-900">Нийт төлсөн</span>
            <span className="font-display text-xl font-black text-brand-700">
              {formatMnt(Number(order.total))}
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-lime-300 bg-lime-50 p-4 text-sm">
          📦 Захиалгын явцыг <strong>"Миний захиалга"</strong> хэсгээс хянах боломжтой.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/account/orders/${order.id}`}
            className="flex flex-1 items-center justify-center rounded-[10px] bg-brand-600 px-5 py-3 font-bold text-white transition hover:bg-brand-700"
          >
            Захиалга харах
          </Link>
          <Link
            href="/products"
            className="flex flex-1 items-center justify-center rounded-[10px] border-[1.5px] border-ink-200 px-5 py-3 font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            Үргэлжлүүлэн худалдан авах
          </Link>
        </div>
      </div>
    </div>
  );
}
