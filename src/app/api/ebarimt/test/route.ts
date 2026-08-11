/**
 * E-Barimt интеграцийн ТЕСТ route — зөвхөн ХӨГЖҮҮЛЭЛТ.
 *
 * Жишээ захиалгаас баримтын хүсэлт бүтээж, PosAPI client-ээр илгээгээд
 * (EBARIMT_POSAPI_URL — жинхэнэ 7080 эсвэл mock) хүсэлт + хариуг буцаана.
 *
 * Хэрэглээ:
 *   GET /api/ebarimt/test           → B2C (хувь хүн)
 *   GET /api/ebarimt/test?type=b2b  → B2B (байгууллага)
 */
import { NextResponse } from "next/server";
import { buildReceiptRequest, type BuildReceiptInput } from "@/lib/ebarimt/build";
import { createReceipt, getPosApiUrl } from "@/lib/ebarimt/posapi";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const url = new URL(req.url);
  const isB2b = url.searchParams.get("type") === "b2b";

  const input: BuildReceiptInput = {
    type: isB2b ? "B2B_RECEIPT" : "B2C_RECEIPT",
    consumerNo: isB2b ? null : "10038071", // жишээ иргэний ebarimt дугаар
    customerTin: isB2b ? "37900846788" : null, // жишээ байгууллагын ТТД
    items: [
      {
        name: "VIDAN Өргөст хэмх 900г",
        classificationCode: "2349010",
        qty: 2,
        unitPrice: 12000,
        taxType: "VAT_ABLE",
        measureUnit: "ш",
      },
      {
        name: "VIDAN Амтат салат 900г",
        classificationCode: "2349010",
        qty: 1,
        unitPrice: 9000,
        taxType: "VAT_ABLE",
        measureUnit: "ш",
      },
    ],
    payment: { code: "BANK_TRANSFER_QPAY", paidAmount: 0 }, // доор бодит дүнгээр солино
  };

  let request;
  try {
    request = buildReceiptRequest(input);
    // Төлсөн дүн = баримтын нийт дүн (НӨАТ шингэсэн)
    request.payments[0].paidAmount = request.totalAmount;
  } catch (e) {
    return NextResponse.json(
      { step: "build", error: (e as Error).message },
      { status: 500 },
    );
  }

  try {
    const response = await createReceipt(request);
    return NextResponse.json({
      posApiUrl: getPosApiUrl(),
      request,
      response,
      note: "⚠️ lottery/qrData-г DB-д хадгалахгүй — зөвхөн харуулах/илгээх",
    });
  } catch (e) {
    return NextResponse.json(
      { step: "createReceipt", posApiUrl: getPosApiUrl(), request, error: (e as Error).message },
      { status: 502 },
    );
  }
}
