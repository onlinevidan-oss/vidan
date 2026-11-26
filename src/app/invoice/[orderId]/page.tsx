import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureInvoiceForOrder } from "@/lib/qpay/orders";
import { qrDataUrl } from "@/lib/ebarimt/qr";
import { vatBreakdown } from "@/lib/pricing";
import { formatUbDate, formatUbDateTime } from "@/lib/datetime";
import {
  INVOICE_SELLER,
  amountInWords,
  buildInvoiceLines,
  invoiceNumber,
  invoiceState,
} from "@/lib/invoice";
import { InvoiceToolbar } from "@/components/customer/InvoiceToolbar";

/**
 * Байгууллагын нэхэмжлэл (0052) — Сангийн сайдын 2017 оны 347 дугаар
 * тушаалын маягтаар. Хэвлэх / PDF болгож хадгалах боломжтой.
 *
 * Захиалагч өөрөө болон ажилтнууд харна (orders-ийн RLS).
 * Төлбөр: данс эсвэл QPay QR. QR-ээр төлбөл автоматаар баталгаажна.
 */
export const metadata = { title: "Нэхэмжлэх", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const n0 = (v: number) => v.toLocaleString("en-US");
const n2 = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function InvoicePage({ params }: PageProps<"/invoice/[orderId]">) {
  const { orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invoice/${orderId}`);

  // RLS: зөвхөн захиалагч өөрөө эсвэл ажилтан уншина
  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, user_id, order_number, created_at, status, payment_status, payment_method,
       discount, shipping, tax, total, voucher_amount, contact_phone,
       ebarimt_customer_tin, invoice_org_name, invoice_email, invoice_due_at,
       items:order_items(product_name, product_sku, quantity, unit_price, subtotal,
         product:products(classification_code)),
       address:addresses(district, khoroo, detail)`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.payment_method !== "invoice") notFound();

  const isOwner = order.user_id === user.id;
  const state = invoiceState(order);
  const no = invoiceNumber(order.order_number);
  const total = Number(order.total);

  const items = (order.items ?? []).map((i) => {
    const p = Array.isArray(i.product) ? i.product[0] : i.product;
    return {
      product_name: i.product_name,
      code: p?.classification_code ?? i.product_sku ?? null,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      subtotal: Number(i.subtotal),
    };
  });
  const { lines, matchesTotal } = buildInvoiceLines({
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    total,
    voucher_amount: Number(order.voucher_amount ?? 0),
    items,
  });
  if (!matchesTotal) {
    console.error(`[invoice] мөрийн нийлбэр нийт дүнтэй таарахгүй order=${order.id}`);
  }
  const vat = vatBreakdown(total);

  // QPay QR — зөвхөн төлөх ёстой үед. Алдаа гарвал данс хэвээр үлдэнэ.
  let qr: string | null = null;
  let qpayUrl: string | null = null;
  if (state === "unconfirmed" && total > 0) {
    try {
      const inv = await ensureInvoiceForOrder({
        id: order.id,
        order_number: order.order_number,
        total,
      });
      qr = inv.qr_text ? await qrDataUrl(inv.qr_text) : inv.qr_image ? `data:image/png;base64,${inv.qr_image}` : null;
      qpayUrl = inv.qpay_short_url;
    } catch (e) {
      console.error(`[invoice qpay failed] order=${order.id}`, e);
    }
  }

  const addr = Array.isArray(order.address) ? order.address[0] : order.address;
  const buyerAddress = addr
    ? ["Улаанбаатар", addr.district, addr.khoroo, addr.detail].filter(Boolean).join(", ")
    : "—";
  const due = order.invoice_due_at ? formatUbDateTime(order.invoice_due_at) : "—";

  return (
    <div className="min-h-screen bg-cream px-4 py-6 print:bg-white print:p-0">
      <InvoiceToolbar
        orderId={order.id}
        state={state}
        due={due}
        backHref={isOwner ? `/account/orders/${order.id}` : `/admin/orders/${order.id}`}
        poll={isOwner && state === "unconfirmed" && qr !== null}
        qpayUrl={qpayUrl}
      />

      {/* ===== Нэхэмжлэх (А4) ===== */}
      <article className="mx-auto w-full max-w-[800px] overflow-x-auto bg-white p-6 text-[12px] leading-snug text-black shadow-sm sm:p-10 print:max-w-none print:overflow-visible print:p-0 print:shadow-none">
        <div className="min-w-[640px] print:min-w-0">
          <div className="text-right text-[11px]">
            Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт
          </div>

          <div className="mt-4 flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/vidan-logo.png" alt="VIDAN" className="h-10 w-auto" />
            <h1 className="flex-1 text-center text-[16px] font-bold tracking-wide">
              НЭХЭМЖЛЭХ №{no}
            </h1>
            <div className="w-[88px]" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-6">
            <dl className="space-y-0.5">
              <dt className="font-bold">Нэхэмжлэгч:</dt>
              <Info k="ТТД" v={INVOICE_SELLER.tin} />
              <Info k="Нэр" v={INVOICE_SELLER.name} />
              <Info k="Хаяг" v={INVOICE_SELLER.address} />
              <Info k="Утас" v={INVOICE_SELLER.phone} />
              <Info k="Э-шуудан" v={INVOICE_SELLER.email} />
              <Info k="Банкны нэр" v={INVOICE_SELLER.bank} />
              <Info k="Банкны дансны дугаар" v={INVOICE_SELLER.account} />
              <Info k="IBAN" v={INVOICE_SELLER.iban} />
            </dl>
            <dl className="space-y-0.5">
              <dt className="font-bold">Хариуцагч:</dt>
              <Info k="ТТД" v={order.ebarimt_customer_tin ?? "—"} />
              <Info k="Нэр" v={order.invoice_org_name ?? "—"} />
              <Info k="Хаяг" v={buyerAddress} />
              <Info k="Утас" v={order.contact_phone ?? "—"} />
              {order.invoice_email && <Info k="Э-шуудан" v={order.invoice_email} />}
              <Info k="Гэрээний №" v="" />
              <Info k="Огноо" v={formatUbDate(order.created_at)} />
              <Info k="Төлбөр хийх хугацаа" v={due} />
            </dl>
          </div>

          <table className="mt-5 w-full border-collapse">
            <thead>
              <tr className="text-left align-top">
                <Th className="w-8">Д/Д</Th>
                <Th>Бараа, ажил, үйлчилгээний нэр</Th>
                <Th className="w-20">Код</Th>
                <Th className="w-14">Хэмжих нэгж</Th>
                <Th className="w-14 text-right">Тоо, хэмжээ</Th>
                <Th className="w-24 text-right">Нэгжийн үнэ</Th>
                <Th className="w-24 text-right">Бүгд үнэ</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <Td>{i + 1}</Td>
                  <Td>{l.name}</Td>
                  <Td>{l.code}</Td>
                  <Td>{l.unit}</Td>
                  <Td className="text-right">{n0(l.quantity)}</Td>
                  <Td className="text-right">{n0(l.unitPrice)}</Td>
                  <Td className="text-right">{n0(l.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 grid grid-cols-[200px_1fr] gap-6">
            <div>
              {qr && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QPay QR" className="h-[150px] w-[150px]" />
                  <div className="mt-1 text-[11px]">QPay-ээр уншуулж төлөх</div>
                </>
              )}
            </div>
            <table className="h-fit w-full border-collapse self-start">
              <tbody>
                <SumRow k="Бараа, ажил үйлчилгээний үнэ:" v={n2(vat.net)} />
                <SumRow k="Нэмэгдсэн өртгийн албан татвар:" v={n2(vat.vat)} />
                <SumRow k="Нийслэл хотын албан татвар:" v="0" />
                <SumRow k="Нийт дүн:" v={n0(total)} bold />
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-right">
            Мөнгөн дүн: {amountInWords(total)}
            <div className="text-[11px] italic">(үсгээр)</div>
          </div>

          <p className="mt-4 rounded border border-black/30 p-2.5 text-[11px]">
            Гүйлгээний утга дээр нэхэмжлэхийн дугаар (<strong>{no}</strong>) болон
            байгууллагын регистрийн дугаараа (<strong>{order.ebarimt_customer_tin ?? "—"}</strong>)
            бичнэ үү. Төлбөрийг <strong>{due}</strong>-аас өмнө төлнө үү — хугацаандаа
            баталгаажаагүй тохиолдолд захиалга автоматаар цуцлагдана.
          </p>

          <div className="mt-8 grid grid-cols-[120px_1fr] items-center gap-4">
            <div className="text-center">(Тамга)</div>
            <div className="space-y-3">
              <div>Захирал:.............................../........................./</div>
              <div>Нягтлан бодогч:.............................../........................./</div>
            </div>
          </div>
        </div>
      </article>
      <p className="mx-auto mt-3 max-w-[800px] text-center text-[11px] text-ink-500 print:hidden">
        <Link href="/" className="hover:underline">
          vidan.mn
        </Link>
      </p>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <dd>
      {k}: {v}
    </dd>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-black/40 px-1.5 py-1 text-[11px] font-normal ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-black/40 px-1.5 py-1 ${className}`}>{children}</td>;
}

function SumRow({ k, v, bold = false }: { k: string; v: string; bold?: boolean }) {
  return (
    <tr>
      <td className={`py-0.5 pr-3 ${bold ? "font-bold" : ""}`}>{k}</td>
      <td className={`w-32 border border-black/40 px-1.5 py-0.5 text-right ${bold ? "font-bold" : ""}`}>
        {v}
      </td>
    </tr>
  );
}
