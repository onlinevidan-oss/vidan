export const SITE_URL = "https://www.vidan.mn";
export const SITE_NAME = "VIDAN";
export const DEFAULT_DESCRIPTION =
  "Видан брэнд — нөөшилсөн хүнсний үйлдвэр, 2008 оноос. Эх орны хөрсөнд ургуулсан даршилсан ногоо, жимсний чанамал, нухаш, зөгийн бал.";
export const DEFAULT_OG_IMAGE = "/vidan-logo.png";

export const NOINDEX_METADATA = {
  robots: { index: false, follow: false },
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
