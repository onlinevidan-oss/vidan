/**
 * Барааны зургийг байршуулахын өмнө браузер дотор жишигт оруулна:
 * дөрвөлжин, цагаан дэвсгэр, бараа талын 90%-д төвлөрсөн, JPEG.
 *
 *  · Дэвсгэр цагаан бол барааг тойруулан тайрч жишгийн хэмжээнд тааруулна.
 *  · Дэвсгэр цагаан БИШ бол (гар утасны зураг, студийн саарал) зураг
 *    бүхлээрээ дөрвөлжинд багтана, гэхдээ `whiteBackground: false` буцаана —
 *    дэвсгэрийг автоматаар арилгах боломжгүй тул админд анхааруулна.
 *
 * Зөвхөн клиент талд (canvas шаардана).
 */
import {
  contentBounds,
  fitPlacement,
  hasWhiteBackground,
  IMAGE_SIZE,
} from "@/lib/image-fit";

/** Шинжлэх зургийн дээд тал — гар утасны 12MP зургийг багасгаж хурдасгана */
const WORK_MAX = 2000;

export type NormalizedImage = {
  blob: Blob;
  /** false бол дэвсгэр цагаан биш — жишигт бүрэн нийцээгүй */
  whiteBackground: boolean;
};

export async function normalizeProductImage(file: File): Promise<NormalizedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const s = Math.min(1, WORK_MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * s));
    const h = Math.max(1, Math.round(bitmap.height * s));

    // Ажлын зураас — эхлээд цагаанаар дүүргэнэ (PNG-ийн тунгалаг хэсэг цагаан болно)
    const work = document.createElement("canvas");
    work.width = w;
    work.height = h;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    if (!wctx) throw new Error("canvas");
    wctx.fillStyle = "#ffffff";
    wctx.fillRect(0, 0, w, h);
    wctx.imageSmoothingQuality = "high";
    wctx.drawImage(bitmap, 0, 0, w, h);

    const { data } = wctx.getImageData(0, 0, w, h);
    const whiteBackground = hasWhiteBackground(data, w, h);

    // Цагаан дэвсгэртэй бол барааны хүрээгээр, үгүй бол зургийг бүхлээр нь
    const bounds = (whiteBackground && contentBounds(data, w, h)) || {
      left: 0,
      top: 0,
      right: w,
      bottom: h,
    };
    const src = {
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    };
    const dst = fitPlacement(src, IMAGE_SIZE, whiteBackground ? undefined : 1);

    const out = document.createElement("canvas");
    out.width = IMAGE_SIZE;
    out.height = IMAGE_SIZE;
    const octx = out.getContext("2d");
    if (!octx) throw new Error("canvas");
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
    octx.imageSmoothingQuality = "high";
    octx.drawImage(
      work,
      bounds.left,
      bounds.top,
      src.width,
      src.height,
      dst.x,
      dst.y,
      dst.width,
      dst.height,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      out.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) throw new Error("toBlob");
    return { blob, whiteBackground };
  } finally {
    bitmap.close();
  }
}
