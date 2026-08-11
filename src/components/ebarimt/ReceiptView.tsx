/**
 * E-Barimt баримт харуулах компонент (presentational).
 * Худалдан авагчид харагдах цахим баримт — QR + сугалаа + задаргаа.
 */
import Image from "next/image";
import type { EbarimtReceiptResponse } from "@/lib/ebarimt/types";

function mnt(n: number): string {
  return `${n.toLocaleString("en-US")}₮`;
}

export function ReceiptView({
  response,
  qrImage,
}: {
  response: EbarimtReceiptResponse;
  qrImage: string;
}) {
  const isB2c = response.type === "B2C_RECEIPT";
  const net = response.totalAmount - response.totalVAT - response.totalCityTax;
  const items = response.receipts.flatMap((r) => r.items);

  return (
    <div className="mx-auto max-w-[420px] overflow-hidden rounded-[16px] border border-ink-200 bg-white">
      {/* Толгой */}
      <div className="border-b border-dashed border-ink-200 bg-cream px-6 py-5 text-center">
        <div className="font-display text-lg font-extrabold tracking-tight text-ink-900">
          ДӨРВӨН ӨЛЗИЙ ХХК
        </div>
        <div className="mt-0.5 text-xs text-ink-500">
          VIDAN · ТТД {response.merchantTin}
        </div>
        <div className="mt-3 inline-flex items-center rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">
          {isB2c ? "Хувь хүний баримт" : "Байгууллагын баримт"}
        </div>
      </div>

      {/* Бараанууд */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium text-ink-900">{it.name}</div>
                <div className="text-xs text-ink-500">
                  {it.qty} × {mnt(it.unitPrice)}
                </div>
              </div>
              <div className="shrink-0 font-semibold text-ink-900">
                {mnt(it.totalAmount)}
              </div>
            </div>
          ))}
        </div>

        {/* Задаргаа */}
        <div className="mt-4 space-y-1.5 border-t border-dashed border-ink-200 pt-4 text-sm">
          <Row label="Дүн (НӨАТ-гүй)" value={mnt(net)} />
          <Row label="НӨАТ (10%)" value={mnt(response.totalVAT)} />
          {response.totalCityTax > 0 && (
            <Row label="НХАТ" value={mnt(response.totalCityTax)} />
          )}
          <div className="flex items-center justify-between pt-1.5 text-base font-extrabold text-ink-900">
            <span>Нийт төлсөн</span>
            <span>{mnt(response.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* QR + сугалаа */}
      <div className="border-t border-dashed border-ink-200 bg-cream px-6 py-5 text-center">
        <Image
          src={qrImage}
          alt="E-Barimt QR"
          width={180}
          height={180}
          unoptimized
          className="mx-auto rounded-lg bg-white p-2"
        />
        {isB2c && response.lottery && (
          <div className="mt-3">
            <div className="text-xs text-ink-500">Сугалааны дугаар</div>
            <div className="font-display text-2xl font-extrabold tracking-widest text-brand-600">
              {response.lottery}
            </div>
          </div>
        )}
        <div className="mt-3 break-all text-[10px] leading-relaxed text-ink-400">
          ДДТД: {response.id}
        </div>
        <div className="text-[10px] text-ink-400">{response.date}</div>
      </div>

      {/* Хөл */}
      <div className="bg-ink-900 px-6 py-3 text-center text-[11px] text-white/70">
        Татварын албанд бүртгэгдсэн цахим баримт · ebarimt.mn
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ink-500">
      <span>{label}</span>
      <span className="font-medium text-ink-700">{value}</span>
    </div>
  );
}
