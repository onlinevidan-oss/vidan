/**
 * E-Barimt PosAPI 3.0 MOCK — зөвхөн ХӨГЖҮҮЛЭЛТ/ТЕСТ-д.
 *
 * Жинхэнэ PosAPI (http://localhost:7080) байхгүй үед интеграцийн логикийг
 * (хүсэлт бүтээх → POST → хариу задлах) туршихад ашиглана.
 * `EBARIMT_POSAPI_URL=http://localhost:3000/api/ebarimt/mock` гэж чиглүүлнэ.
 *
 * ⚠️ Production-д хэзээ ч ашиглахгүй — доор орчинг шалгаж хааж байна.
 */
import { NextResponse } from "next/server";
import type {
  EbarimtReceiptRequest,
  EbarimtReceiptResponse,
} from "@/lib/ebarimt/types";

function guard(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }
  return null;
}

function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export async function POST(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;

  const body = (await req.json()) as EbarimtReceiptRequest;

  // Хамгийн наад захын баталгаажуулалт (жинхэнэ PosAPI-тай ойролцоо алдаа)
  if (!body.merchantTin || !body.districtCode || !body.posNo) {
    return NextResponse.json(
      { status: "ERROR", message: "merchantTin/districtCode/posNo дутуу" },
      { status: 400 },
    );
  }
  if (!body.receipts?.length) {
    return NextResponse.json(
      { status: "ERROR", message: "receipts хоосон" },
      { status: 400 },
    );
  }
  if (body.type === "B2B_RECEIPT" && !body.customerTin) {
    return NextResponse.json(
      { status: "ERROR", message: "B2B баримтад customerTin шаардлагатай" },
      { status: 400 },
    );
  }

  const headId = `0${body.merchantTin}`.slice(0, 12) + randDigits(21);
  const now = new Date();

  const res: EbarimtReceiptResponse = {
    id: headId.slice(0, 33).padEnd(33, "0"),
    version: "3.0.12-mock",
    totalAmount: body.totalAmount,
    totalVAT: body.totalVAT,
    totalCityTax: body.totalCityTax,
    branchNo: body.branchNo,
    districtCode: body.districtCode,
    merchantTin: body.merchantTin,
    posNo: body.posNo,
    consumerNo: body.consumerNo ?? undefined,
    type: body.type,
    receipts: body.receipts.map((r) => ({
      id: randDigits(33),
      totalAmount: r.totalAmount,
      taxType: r.taxType,
      items: r.items,
      merchantTin: r.merchantTin,
      totalVAT: r.totalVAT,
      totalCityTax: r.totalCityTax,
    })),
    payments: body.payments.map((p) => ({
      code: p.code,
      paidAmount: p.paidAmount,
      status: p.status,
    })),
    posId: 101317077,
    status: "SUCCESS",
    qrData: randDigits(180),
    // B2C бол сугалааны дугаар олгоно (иргэнд); B2B-д сугалаа байхгүй
    lottery: body.type === "B2C_RECEIPT" ? `FG ${randDigits(8)}` : undefined,
    date: fmtDate(now),
    easy: false,
  };

  return NextResponse.json(res);
}

export async function DELETE(req: Request) {
  const blocked = guard();
  if (blocked) return blocked;
  const body = (await req.json()) as { id?: string; date?: string };
  if (!body.id || !body.date) {
    return NextResponse.json({ error: "id/date дутуу" }, { status: 400 });
  }
  return NextResponse.json({ status: "SUCCESS", id: body.id });
}
