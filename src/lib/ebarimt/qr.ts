/**
 * E-Barimt QR — `qrData` түүхий текстээс QR зургийн data URL үүсгэнэ.
 * ⚠️ qrData-г DB-д хадгалахгүй — зөвхөн энд шууд зураг болгож харуулна.
 */
import "server-only";
import QRCode from "qrcode";

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
}
