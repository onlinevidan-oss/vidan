/**
 * Vidan fruit — ЗАГВАР (2026-10-14).
 *
 * Өөр компанийн борлуулалт (шинэхэн жимс, хайрцгаар; эхний ээлжинд алим). Захирал, санхүүгийн
 * шийдвэр гарах хүртэл зөвхөн загвар — хэрэглэгчдэд харагдахгүй:
 *   · `NEXT_PUBLIC_FRUIT_PREVIEW=1` тугтай орчинд л цэс, карт, хуудас гарна.
 *     Production-д туг байхгүй тул бүгд нуугдаж, хуудас нь 404 буцаана.
 *   · Өгөгдлийн санд ХҮРЭХГҮЙ — брэнд/бараа DB-д нэмбэл vidan.mn-д шууд
 *     гарна. Тиймээс өгөгдөл энд, код дотор.
 *   · Захиалга, төлбөр хийгдэхгүй — сагсны урсгал, QPay, и-баримт аль
 *     компанийн нэр дээр явах нь шийдэгдээгүй.
 *
 * Шийдвэр гарсны дараа: брэнд, барааг DB-д жинхэнэ байдлаар нэмж, энэ
 * файлыг устгана.
 */

export const FRUIT_PREVIEW = process.env.NEXT_PUBLIC_FRUIT_PREVIEW === "1";

export const FRUIT_BRAND = {
  id: "vidan-fruit-preview",
  name: "Vidan fruit",
  slug: "vidan-fruit",
  logo_url: "/fruit/logo.png",
  card_from: "#e3262a",
  card_to: "#b81e22",
  logo_mode: "contain",
} as const;

export type FruitProduct = {
  id: string;
  origin: string;
  flag: string;
  variety: string;
  boxKg: number;
  pricePerBox: number;
  image: string;
};

/**
 * `Алим үнэ.xlsx` (2026-10-14)-оос. Зураг: эзний өгсөн (2026-10-15) —
 * Польш Jonagored-ийнх л Facebook-ээс таамгаар сонгосон хэвээр.
 * "Red" нь зураг дээр "Red Prince" гэж бичигдсэн тул тэгж нэрлэв.
 */
export const FRUIT_PRODUCTS: FruitProduct[] = [
  { id: "polsh-red", origin: "Польш", flag: "🇵🇱", variety: "Red Prince", boxKg: 12, pricePerBox: 70000, image: "/fruit/polsh-red-v3.jpg" },
  { id: "polsh-jonagored", origin: "Польш", flag: "🇵🇱", variety: "Jonagored", boxKg: 12, pricePerBox: 70000, image: "/fruit/polsh-jonagored.jpg" },
  { id: "polsh-gala", origin: "Польш", flag: "🇵🇱", variety: "Gala", boxKg: 12, pricePerBox: 70000, image: "/fruit/polsh-gala-v3.jpg" },
  { id: "belgi-jonagored", origin: "Бельги", flag: "🇧🇪", variety: "Jonagored", boxKg: 8, pricePerBox: 70000, image: "/fruit/belgi-jonagored-v3.jpg" },
];

/** Нэвтэрсэн хэрэглэгчид мэдэгдэл нэг л удаа — энэ түлхүүрээр тэмдэглэнэ */
export const FRUIT_TOAST_KEY = "vidan-fruit-toast-seen";
