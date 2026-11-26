/**
 * Байгууллагын нэхэмжлэлийн имэйл (0052) — цэвэр HTML/текст үүсгэгч.
 * Илгээх нь src/lib/email/invoice.ts-д. Имэйлийн програмууд CSS-ийг
 * таслдаг тул бүх загвар inline, хүснэгтээр.
 */
import { INVOICE_SELLER, amountInWords, type InvoiceLine } from "./invoice.ts";

export type InvoiceEmailInput = {
  no: string;
  orderNumber: string;
  orgName: string;
  orgTin: string;
  createdDate: string;
  due: string;
  lines: InvoiceLine[];
  net: number;
  vat: number;
  total: number;
  /** QPay-ийн богино холбоос (байвал "Банкны апп-аар төлөх" товч) */
  qpayUrl: string | null;
  /** QR зураг имэйлд хавсаргасан бол түүний cid */
  qrCid: string | null;
  /** Сайтад нэхэмжлэх харах холбоос */
  invoiceUrl: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n0 = (v: number) => v.toLocaleString("en-US");
const n2 = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function invoiceEmailSubject(i: Pick<InvoiceEmailInput, "no" | "total">): string {
  return `VIDAN — Нэхэмжлэх №${i.no} (${n0(i.total)}₮)`;
}

export function invoiceEmailHtml(i: InvoiceEmailInput): string {
  const S = INVOICE_SELLER;
  const td = 'style="border:1px solid #999;padding:4px 6px;font-size:12px;vertical-align:top"';
  const tdr = 'style="border:1px solid #999;padding:4px 6px;font-size:12px;text-align:right;vertical-align:top;white-space:nowrap"';
  const th = 'style="border:1px solid #999;padding:4px 6px;font-size:11px;font-weight:normal;text-align:left;background:#f4f4f4"';

  const rows = i.lines
    .map(
      (l, k) => `<tr>
<td ${td}>${k + 1}</td><td ${td}>${esc(l.name)}</td><td ${td}>${esc(l.code)}</td>
<td ${td}>${esc(l.unit)}</td><td ${tdr}>${n0(l.quantity)}</td>
<td ${tdr}>${n0(l.unitPrice)}</td><td ${tdr}>${n0(l.amount)}</td></tr>`,
    )
    .join("\n");

  const pay = i.qpayUrl
    ? `<p style="margin:16px 0"><a href="${esc(i.qpayUrl)}" style="display:inline-block;background:#e11d2a;color:#fff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">📱 Банкны апп-аар (QPay) төлөх</a></p>`
    : "";
  const qr = i.qrCid
    ? `<img src="cid:${esc(i.qrCid)}" alt="QPay QR" width="150" height="150" style="display:block"/><div style="font-size:11px">QPay-ээр уншуулж төлөх</div>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:16px;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:720px;margin:0 auto">
<p style="font-size:14px">Сайн байна уу,</p>
<p style="font-size:14px"><strong>${esc(i.orgName)}</strong>-ийн VIDAN-аас хийсэн <strong>${esc(i.orderNumber)}</strong> захиалгын нэхэмжлэхийг илгээж байна.</p>
<p style="font-size:14px;background:#fff3d6;color:#7a4d00;padding:10px;border-radius:6px">Захиалга шивсний дараа та 24 цагийн дотор төлбөрөө баталгаажуулна уу. Баталгаажуулаагүй тохиолдолд захиалга цуцлагдахыг анхаарна уу.<br/><strong>Төлөх эцсийн хугацаа: ${esc(i.due)}</strong></p>
${pay}
<div style="border:1px solid #ddd;padding:20px;margin-top:12px">
<div style="text-align:right;font-size:11px">Сангийн сайдын 2017 оны 347 дугаар тушаалын хавсралт</div>
<h1 style="text-align:center;font-size:16px;margin:14px 0">НЭХЭМЖЛЭХ №${esc(i.no)}</h1>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;line-height:1.5"><tr>
<td width="50%" valign="top"><strong>Нэхэмжлэгч:</strong><br/>ТТД: ${S.tin}<br/>Нэр: ${S.name}<br/>Хаяг: ${S.address}<br/>Утас: ${S.phone}<br/>Э-шуудан: ${S.email}<br/>Банкны нэр: ${S.bank}<br/>Банкны дансны дугаар: <strong>${S.account}</strong><br/>IBAN: ${S.iban}</td>
<td width="50%" valign="top"><strong>Хариуцагч:</strong><br/>ТТД: ${esc(i.orgTin)}<br/>Нэр: ${esc(i.orgName)}<br/>Огноо: ${esc(i.createdDate)}<br/>Төлбөр хийх хугацаа: ${esc(i.due)}</td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px">
<tr><th ${th}>Д/Д</th><th ${th}>Бараа, ажил, үйлчилгээний нэр</th><th ${th}>Код</th><th ${th}>Хэмжих нэгж</th><th ${th}>Тоо, хэмжээ</th><th ${th}>Нэгжийн үнэ</th><th ${th}>Бүгд үнэ</th></tr>
${rows}
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:12px"><tr>
<td width="170" valign="top">${qr}</td>
<td valign="top"><table align="right" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
<tr><td style="padding:2px 10px 2px 0">Бараа, ажил үйлчилгээний үнэ:</td><td ${tdr}>${n2(i.net)}</td></tr>
<tr><td style="padding:2px 10px 2px 0">Нэмэгдсэн өртгийн албан татвар:</td><td ${tdr}>${n2(i.vat)}</td></tr>
<tr><td style="padding:2px 10px 2px 0">Нийслэл хотын албан татвар:</td><td ${tdr}>0</td></tr>
<tr><td style="padding:2px 10px 2px 0"><strong>Нийт дүн:</strong></td><td ${tdr}><strong>${n0(i.total)}</strong></td></tr>
</table></td></tr></table>
<p style="text-align:right;font-size:12px;margin-top:10px">Мөнгөн дүн: ${amountInWords(i.total)}</p>
<p style="font-size:11px;border:1px solid #bbb;padding:8px">Гүйлгээний утга дээр нэхэмжлэхийн дугаар (<strong>${esc(i.no)}</strong>) болон байгууллагын регистрийн дугаараа (<strong>${esc(i.orgTin)}</strong>) бичнэ үү.</p>
</div>
<p style="font-size:13px;margin-top:14px">Нэхэмжлэхийг хэвлэх, PDF-ээр хадгалах: <a href="${esc(i.invoiceUrl)}">${esc(i.invoiceUrl)}</a></p>
<p style="font-size:12px;color:#666">Асуух зүйл байвал ${S.phone} утсаар холбогдоно уу.<br/>VIDAN · vidan.mn</p>
</div></body></html>`;
}

/** HTML уншдаггүй програмд зориулсан энгийн текст */
export function invoiceEmailText(i: InvoiceEmailInput): string {
  const S = INVOICE_SELLER;
  return [
    `НЭХЭМЖЛЭХ №${i.no} — ${i.orgName} (РД ${i.orgTin})`,
    `Захиалга ${i.orderNumber}, огноо ${i.createdDate}`,
    "",
    ...i.lines.map((l, k) => `${k + 1}. ${l.name} — ${n0(l.quantity)} × ${n0(l.unitPrice)} = ${n0(l.amount)}₮`),
    "",
    `Нийт дүн: ${n0(i.total)}₮ (НӨАТ ${n2(i.vat)})`,
    `Мөнгөн дүн: ${amountInWords(i.total)}`,
    "",
    `Данс: ${S.bank} ${S.account} (IBAN ${S.iban}), хүлээн авагч ${S.name}`,
    `Гүйлгээний утга: ${i.no} ${i.orgTin}`,
    i.qpayUrl ? `QPay-ээр төлөх: ${i.qpayUrl}` : "",
    "",
    `Төлөх эцсийн хугацаа: ${i.due}. Хугацаандаа баталгаажаагүй бол захиалга цуцлагдана.`,
    `Нэхэмжлэх: ${i.invoiceUrl}`,
  ]
    .filter((x, k, a) => x !== "" || a[k - 1] !== "")
    .join("\n");
}
