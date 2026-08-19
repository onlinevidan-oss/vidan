/**
 * E-Barimt ДЕМО хуудас — зөвхөн ХӨГЖҮҮЛЭЛТ.
 * Жишээ захиалгаас баримт бүтээж (mock PosAPI), хэрэглэгчид QR + сугалаатай
 * баримт хэрхэн харагдахыг үзүүлнэ. Production-д нээгдэхгүй.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildReceiptRequest, type BuildReceiptInput } from "@/lib/ebarimt/build";
import { createReceipt } from "@/lib/ebarimt/posapi";
import { qrDataUrl } from "@/lib/ebarimt/qr";
import { ReceiptView } from "@/components/ebarimt/ReceiptView";

/** Демо баримт бүтээх — алдааг JSX-ээс тусад нь буцаана */
async function buildDemoReceipt(input: BuildReceiptInput) {
  try {
    const request = buildReceiptRequest(input);
    request.payments[0].paidAmount = request.totalAmount;
    const response = await createReceipt(request);
    const qrImage = await qrDataUrl(response.qrData);
    return { response, qrImage };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export default async function EbarimtDemoPage({
  searchParams,
}: PageProps<"/ebarimt/demo">) {
  if (process.env.NODE_ENV === "production") notFound();

  const sp = await searchParams;
  const isB2b = sp.type === "b2b";

  const input: BuildReceiptInput = {
    type: isB2b ? "B2B_RECEIPT" : "B2C_RECEIPT",
    consumerNo: isB2b ? null : "10038071",
    customerTin: isB2b ? "37900846788" : null,
    items: [
      {
        name: "VIDAN Өргөст хэмх 900г",
        classificationCode: "2349010",
        qty: 2,
        unitPrice: 12000,
        measureUnit: "ш",
      },
      {
        name: "VIDAN Амтат салат 900г",
        classificationCode: "2349010",
        qty: 1,
        unitPrice: 9000,
        measureUnit: "ш",
      },
    ],
    payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 },
  };

  const receipt = await buildDemoReceipt(input);

  const content =
    "error" in receipt ? (
      <div className="mx-auto max-w-[420px] rounded-[16px] border border-brand-200 bg-brand-50 p-6 text-sm text-brand-700">
        <div className="font-bold">Баримт үүсгэж чадсангүй</div>
        <div className="mt-1">{receipt.error}</div>
        <div className="mt-2 text-xs text-ink-500">
          EBARIMT_POSAPI_URL тохируулсан эсэхийг шалгана уу (mock:
          http://localhost:3000/api/ebarimt/mock).
        </div>
      </div>
    ) : (
      <ReceiptView response={receipt.response} qrImage={receipt.qrImage} />
    );

  return (
    <div className="my-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
          E-Barimt демо
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Худалдан авагчид баримт хэрхэн харагдах (тест өгөгдөл)
        </p>
        <div className="mt-4 inline-flex rounded-[10px] border border-ink-200 bg-white p-1 text-sm">
          <Link
            href="/ebarimt/demo"
            className={`rounded-[8px] px-4 py-1.5 font-semibold transition ${
              !isB2b ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Хувь хүн
          </Link>
          <Link
            href="/ebarimt/demo?type=b2b"
            className={`rounded-[8px] px-4 py-1.5 font-semibold transition ${
              isB2b ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-900"
            }`}
          >
            Байгууллага
          </Link>
        </div>
      </div>
      {content}
    </div>
  );
}
