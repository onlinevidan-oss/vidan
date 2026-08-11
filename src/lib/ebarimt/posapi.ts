/**
 * E-Barimt PosAPI 3.0 client.
 *
 * PosAPI 3.0 нь мерчантын машин дээр локалаар суудаг REST service
 * (default `http://localhost:7080`). Cloud/serverless орчноос шууд
 * хандах боломжгүй тул production-д tunnel/VPN/public-IP-аар гаргана.
 *
 * Base URL нь `EBARIMT_POSAPI_URL` env-ээс ирнэ. Тохируулаагүй бол
 * client ажиллахгүй (best-effort дуудлагууд чимээгүй алгасна).
 */
import "server-only";
import type {
  EbarimtReceiptRequest,
  EbarimtReceiptResponse,
  EbarimtReturnRequest,
} from "./types";

/** PosAPI base URL — жишээ: http://localhost:7080 эсвэл tunnel хаяг */
export function getPosApiUrl(): string | null {
  const url = process.env.EBARIMT_POSAPI_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function isEbarimtConfigured(): boolean {
  return getPosApiUrl() !== null;
}

class EbarimtError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "EbarimtError";
  }
}
export { EbarimtError };

const TIMEOUT_MS = 15_000;

async function posApiFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const base = getPosApiUrl();
  if (!base) {
    throw new EbarimtError("EBARIMT_POSAPI_URL тохируулаагүй байна");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Баримт үүсгэх — POST /rest/receipt
 * `status === "SUCCESS"` биш бол алдаа шиднэ.
 */
export async function createReceipt(
  req: EbarimtReceiptRequest,
): Promise<EbarimtReceiptResponse> {
  const res = await posApiFetch("/rest/receipt", {
    method: "POST",
    body: JSON.stringify(req),
  });

  const text = await res.text();
  let data: EbarimtReceiptResponse;
  try {
    data = JSON.parse(text) as EbarimtReceiptResponse;
  } catch {
    throw new EbarimtError(
      `PosAPI-с буруу хариу ирлээ (${res.status})`,
      res.status,
      text,
    );
  }

  if (!res.ok || data.status !== "SUCCESS") {
    throw new EbarimtError(
      data.message || `Баримт үүсгэж чадсангүй (${data.status ?? res.status})`,
      res.status,
      data,
    );
  }
  return data;
}

/**
 * Баримт буцаах — DELETE /rest/receipt
 * Зөвхөн иргэн баталгаажуулаагүй B2C баримтыг идэвхгүй болгоно.
 */
export async function returnReceipt(req: EbarimtReturnRequest): Promise<void> {
  const res = await posApiFetch("/rest/receipt", {
    method: "DELETE",
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new EbarimtError(
      `Баримт буцааж чадсангүй (${res.status})`,
      res.status,
      body,
    );
  }
}

/** PosAPI ажиллагааны мэдээлэл — GET /rest/info (эрүүл мэндийн шалгалт) */
export async function getInfo(): Promise<unknown> {
  const res = await posApiFetch("/rest/info", { method: "GET" });
  if (!res.ok) {
    throw new EbarimtError(`PosAPI info алдаа (${res.status})`, res.status);
  }
  return res.json();
}

/** Хадгалсан баримтуудыг нэгдсэн систем рүү илгээх — POST /rest/sendData */
export async function sendData(): Promise<unknown> {
  const res = await posApiFetch("/rest/sendData", { method: "POST" });
  if (!res.ok) {
    throw new EbarimtError(`sendData алдаа (${res.status})`, res.status);
  }
  return res.json();
}
