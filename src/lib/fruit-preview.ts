/**
 * Vidan fruit — ЗАГВАР (2026-10-14).
 *
 * Өөр компанийн борлуулалт (шинэхэн жимс, кг савлагаа ба хайрцгаар;
 * эхний ээлжинд алим). Захирал, санхүүгийн
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

export type FruitOption = {
  /** Жнь. "1 кг савлагаа" */
  label: string;
  price: number;
  /** Нэмэлт тайлбар, жнь. 1 кг-ын үнэ */
  note?: string;
};

export type FruitProduct = {
  id: string;
  origin: string;
  flag: string;
  /** Сорт — Польш алимд заагаагүй */
  variety: string | null;
  /** Зураггүй бол "зураг удахгүй" дүрс гарна */
  image: string | null;
  options: FruitOption[];
};

/**
 * Эзний үнийн жагсаалт (2026-10-28). Кг савлагаа ба бүтэн хайрцаг.
 * Kanzi-ийн зураг хараахан ирээгүй.
 */
export const FRUIT_PRODUCTS: FruitProduct[] = [
  {
    id: "belgi-jonagored",
    origin: "Бельги",
    flag: "🇧🇪",
    variety: "Jonagored",
    image: "/fruit/belgi-jonagored-v3.jpg",
    options: [
      { label: "1 кг савлагаа", price: 12000 },
      { label: "8 кг бүтэн хайрцаг", price: 92000 },
    ],
  },
  {
    id: "belgi-kanzi",
    origin: "Бельги",
    flag: "🇧🇪",
    variety: "Kanzi",
    image: null,
    options: [
      { label: "1 кг савлагаа", price: 15500 },
      { label: "8 кг бүтэн хайрцаг", price: 120000 },
    ],
  },
  {
    id: "polsh",
    origin: "Польш",
    flag: "🇵🇱",
    variety: null,
    image: "/fruit/polsh-gala-v3.jpg",
    options: [
      { label: "1 кг савлагаа", price: 7900 },
      { label: "1.5 кг савлагаа", price: 11850 },
      { label: "12 кг бүтэн хайрцаг", price: 90000 },
    ],
  },
];

/** Хүргэлтийн нөхцөл (эзний жагсаалт, 2026-10-28) */
export const FRUIT_DELIVERY = { minOrder: 40000, fee: 7700 } as const;

/** Нэвтэрсэн хэрэглэгчид мэдэгдэл нэг л удаа — энэ түлхүүрээр тэмдэглэнэ */
export const FRUIT_TOAST_KEY = "vidan-fruit-toast-seen";
