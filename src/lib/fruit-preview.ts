/**
 * "Жимс" цэс (Vidan fruit) — өөр компанийн борлуулалт, шинэхэн алим кг
 * савлагаа ба хайрцгаар. 2026-11-18 захирал зөвшөөрч сайтад гарсан.
 * Бараа нь сангийн жинхэнэ бараа (0053), баримт Дөрвөн-Өлзийн нэр дээр
 * (одоогийн QPay, и-баримт); хоёр компани дотоод хөдөлгөөнөөр тооцоо нийлнэ.
 *
 * Яаралтай нуух бол орчинд NEXT_PUBLIC_FRUIT_PREVIEW=0 гэж тавина.
 */
export const FRUIT_PREVIEW = process.env.NEXT_PUBLIC_FRUIT_PREVIEW !== "0";

export const FRUIT_BRAND = {
  id: "vidan-fruit-preview",
  name: "Жимс",
  slug: "vidan-fruit",
  logo_url: "/fruit/logo.png",
  card_from: "#e3262a",
  card_to: "#b81e22",
  logo_mode: "contain",
} as const;

/** Савлагааны сонголт — бараа нь сангийн жинхэнэ бараа (SKU-аар) */
export type FruitOptionDef = {
  /** Жнь. "1 кг савлагаа" */
  label: string;
  sku: string;
};

export type FruitVarietyDef = {
  id: string;
  origin: string;
  flag: string;
  /** Сорт — Польш алимд заагаагүй */
  variety: string | null;
  image: string;
  options: FruitOptionDef[];
};

/**
 * Жимсний хуудасны бүтэц (эзний үнийн жагсаалт, 2026-10-28). Үнэ,
 * үлдэгдэл, id нь САНГААС (0053) — энд зөвхөн бүлэглэлт ба зураг.
 * Сорт бүрийн сонголтууд нэг кг-ын нөөцөөс зарагдана.
 */
export const FRUIT_VARIETIES: FruitVarietyDef[] = [
  {
    id: "belgi-jonagored",
    origin: "Бельги",
    flag: "🇧🇪",
    variety: "Jonagored",
    image: "/fruit/belgi-jonagored-v4.jpg",
    options: [
      { label: "1 кг савлагаа", sku: "VIDAN052" },
      { label: "8 кг бүтэн хайрцаг", sku: "VIDAN051" },
    ],
  },
  {
    id: "belgi-kanzi",
    origin: "Бельги",
    flag: "🇧🇪",
    variety: "Kanzi",
    image: "/fruit/belgi-kanzi-v4.jpg",
    options: [
      { label: "1 кг савлагаа", sku: "VIDAN054" },
      { label: "8 кг бүтэн хайрцаг", sku: "VIDAN053" },
    ],
  },
  {
    id: "polsh",
    origin: "Польш",
    flag: "🇵🇱",
    variety: null,
    image: "/fruit/polsh-red-v4.jpg",
    options: [
      { label: "1 кг савлагаа", sku: "VIDAN055" },
      { label: "1.5 кг савлагаа", sku: "VIDAN056" },
      { label: "12 кг бүтэн хайрцаг", sku: "VIDAN048" },
    ],
  },
];

export const FRUIT_SKUS = FRUIT_VARIETIES.flatMap((v) => v.options.map((o) => o.sku));

/** Хуудсанд дамжих бэлэн сонголт — сангийн бараатай нийлсэн */
export type FruitOption = {
  label: string;
  productId: string;
  sku: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
};

export type FruitProduct = Omit<FruitVarietyDef, "options"> & { options: FruitOption[] };

/** Хүргэлтийн төлбөр (сайтынхтай ижил 7,000 + НӨАТ). Доод дүн нь
 * site_settings.commerce.fruit_min_order_amount-аас (0053). */
export const FRUIT_DELIVERY_FEE = 7700;

/** Нэвтэрсэн хэрэглэгчид мэдэгдэл нэг л удаа — энэ түлхүүрээр тэмдэглэнэ */
export const FRUIT_TOAST_KEY = "vidan-fruit-toast-seen";
