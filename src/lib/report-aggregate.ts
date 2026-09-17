/**
 * Тайлангийн тоо нэгтгэлт — цэвэр функцууд (DB-д хүрэхгүй).
 *
 * Эдгээр тоо САНХҮҮД өгөгддөг тул тусад нь тестлэгдэх ёстой. Query давхарга
 * (`queries/reports.ts`) нь зөвхөн өгөгдөл татаж, эндэх функцуудыг дуудна.
 */
import { shippingVat } from "./pricing.ts";


export type ReportOrderItem = {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  /** Мөрийн дүн — захиалгын түвшний промо хөнгөлөлтийн ӨМНӨХ */
  subtotal: number;
  product?: { category?: { name_mn: string } | null } | null;
};

export type ReportOrder = {
  /** Ажилтны өөрийн (туршилтын, дотоод) захиалга эсэх */
  is_internal?: boolean;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  payment_method: string | null;
  created_at: string;
  items: ReportOrderItem[];
};

/** Санхүүгийн задаргаа — барааны орлого, хүргэлт, НӨАТ тусад нь */
export type FinanceSummary = {
  /** Барааны дүн, хөнгөлөлтийн өмнө */
  goods: number;
  /** Промо кодоор буурсан дүн */
  discount: number;
  /** Барааны цэвэр орлого = goods − discount */
  netGoods: number;
  /** Хүргэлтийн орлого */
  shipping: number;
  /** Хүргэлтийн төлбөр авсан захиалгын тоо */
  deliveries: number;
  /** НӨАТ — бодитоор авсан нийт дүн (shippingVat + legacyGoodsVat) */
  tax: number;
  /**
   * Хүргэлтийн үнэн дээр ногдох НӨАТ (10%) — одоо мөрдөж буй дүрэм.
   * Барааны үнэд НӨАТ аль хэдийн багтсан тул зөвхөн хүргэлт дээр нэмнэ.
   */
  shippingVat: number;
  /**
   * Хуучин дүрмээр бодогдсон захиалгуудын НӨАТ.
   *
   * 2026-09-14 хүртэл систем барааны дүн дээр 10% нэмж байсан. Гэтэл
   * санхүү барааны үнэд НӨАТ аль хэдийн багтсан гэж тодруулсан тул
   * дүрмийг өөрчилсөн.
   *
   * Захиалгыг ХЭСЭГЛЭХГҮЙ — бүтнээр нь аль нэг дүрэмд хамааруулна.
   * Хэсэгчлэн хуваарилвал "хүргэлтийн НӨАТ" мөрөнд үнэндээ бараан
   * дээр авсан мөнгө орж, тоо бүрхэг болно.
   *
   * Энэ тоо 0 биш бол тухайн хугацаанд ХОЁР өөр дүрэм хольцолдсон
   * гэсэн үг: нэг мөрөнд нийлүүлж татварын тайланд өгч БОЛОХГҮЙ.
   */
  legacyGoodsVat: number;
  /** Хуучин дүрмээр бодогдсон захиалгын тоо */
  legacyOrders: number;
  /** Нийт (= netGoods + shipping + tax) */
  total: number;
  orders: number;
  avgOrder: number;
};

export function summarizeFinance(orders: ReportOrder[]): FinanceSummary {
  const n = (v: unknown) => Number(v ?? 0);
  const acc = orders.reduce(
    (s, o) => {
      const shipping = n(o.shipping);
      const tax = n(o.tax);
      s.goods += n(o.subtotal);
      s.discount += n(o.discount);
      s.shipping += shipping;
      s.tax += tax;
      s.total += n(o.total);
      if (shipping > 0) s.deliveries += 1;

      // Захиалга бүтнээр нь аль нэг дүрэмд хамаарна. ±1₮ тэвчээр нь
      // дугуйрлалтын зөрүүд — дүрэм өөрчлөгдсөн гэсэн үг биш.
      if (Math.abs(tax - shippingVat(shipping)) <= 1) {
        s.shippingVat += tax;
      } else {
        s.legacyGoodsVat += tax;
        s.legacyOrders += 1;
      }
      return s;
    },
    {
      goods: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      deliveries: 0,
      shippingVat: 0,
      legacyGoodsVat: 0,
      legacyOrders: 0,
    },
  );

  return {
    ...acc,
    netGoods: acc.goods - acc.discount,
    orders: orders.length,
    avgOrder: orders.length > 0 ? Math.round(acc.total / orders.length) : 0,
  };
}

export type SoldProduct = {
  name: string;
  sku: string;
  sold: number;
  /** Дүн — захиалгын түвшний промо хөнгөлөлтийн ӨМНӨХ */
  revenue: number;
};

/**
 * Зарагдсан бүтээгдэхүүн бүрийг тоо ширхэг ба дүнгээр нь.
 * Ижил бараа олон захиалгад орсон бол нэгтгэнэ.
 */
export function summarizeSoldProducts(orders: ReportOrder[]): SoldProduct[] {
  const map = new Map<string, SoldProduct>();
  for (const o of orders) {
    for (const i of o.items ?? []) {
      const key = i.product_id ?? `${i.product_name}|${i.product_sku ?? ""}`;
      const cur = map.get(key) ?? {
        name: i.product_name,
        sku: i.product_sku ?? "—",
        sold: 0,
        revenue: 0,
      };
      cur.sold += Number(i.quantity ?? 0);
      cur.revenue += Number(i.subtotal ?? 0);
      map.set(key, cur);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.revenue - a.revenue || b.sold - a.sold,
  );
}

export type DailyRevenue = { date: string; revenue: number; orders: number };

/** Өдрөөр задлах — өгөгдсөн бүх өдөр гарна (захиалгагүй өдөр 0) */
export function summarizeByDay(
  orders: ReportOrder[],
  dayKeys: string[],
  keyOf: (d: Date) => string,
): DailyRevenue[] {
  const map = new Map(dayKeys.map((k) => [k, { revenue: 0, orders: 0 }]));
  for (const o of orders) {
    const slot = map.get(keyOf(new Date(o.created_at)));
    if (slot) {
      slot.revenue += Number(o.total ?? 0);
      slot.orders += 1;
    }
  }
  return dayKeys.map((date) => ({ date, ...map.get(date)! }));
}

export type CategoryShare = { name: string; revenue: number; share: number };

export function summarizeByCategory(orders: ReportOrder[]): CategoryShare[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.items ?? []) {
      const cat = i.product?.category?.name_mn ?? "Бусад";
      map.set(cat, (map.get(cat) ?? 0) + Number(i.subtotal ?? 0));
    }
  }
  const total = Array.from(map.values()).reduce((s, v) => s + v, 0) || 1;
  return Array.from(map.entries())
    .map(([name, revenue]) => ({ name, revenue, share: revenue / total }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type PaymentShare = {
  method: string;
  count: number;
  revenue: number;
  share: number;
};

export function summarizeByPayment(orders: ReportOrder[]): PaymentShare[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const m = o.payment_method ?? "—";
    const cur = map.get(m) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(o.total ?? 0);
    map.set(m, cur);
  }
  const total = orders.length || 1;
  return Array.from(map.entries())
    .map(([method, v]) => ({ method, ...v, share: v.count / total }))
    .sort((a, b) => b.count - a.count);
}

export type StockRow = {
  name_mn: string;
  sku: string;
  stock: number;
  price: number;
  stock_threshold: number;
  category?: { name_mn: string } | null;
};

export type InventoryItem = {
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  /** Үлдэгдлийн зарах үнээр илэрхийлсэн дүн */
  value: number;
  low: boolean;
  out: boolean;
};

export type InventorySummary = {
  items: InventoryItem[];
  /** Нийт бүтээгдэхүүний тоо ширхэг (агуулахын үлдэгдэл) */
  totalUnits: number;
  /** Үлдэгдлийн нийт дүн (зарах үнээр) */
  totalValue: number;
  /** Нэр төрлийн тоо */
  skuCount: number;
  /** Босго хүрсэн (дуусах дөхсөн) нэр төрөл */
  lowCount: number;
  /** Бүрэн дууссан нэр төрөл */
  outCount: number;
};

/**
 * Агуулахын үлдэгдлийн нэгтгэл.
 * Үлдэгдэл цөөрснөөр эхэлж эрэмбэлнэ — дуусах дөхсөнийг эхэнд харуулна.
 */
export function summarizeInventory(rows: StockRow[]): InventorySummary {
  const items: InventoryItem[] = rows.map((r) => {
    const stock = Number(r.stock ?? 0);
    const price = Number(r.price ?? 0);
    return {
      name: r.name_mn,
      sku: r.sku,
      category: r.category?.name_mn ?? "—",
      stock,
      price,
      value: stock * price,
      low: stock > 0 && stock <= Number(r.stock_threshold ?? 0),
      out: stock <= 0,
    };
  });

  return {
    items: items.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "mn")),
    totalUnits: items.reduce((s, i) => s + i.stock, 0),
    totalValue: items.reduce((s, i) => s + i.value, 0),
    skuCount: items.length,
    lowCount: items.filter((i) => i.low).length,
    outCount: items.filter((i) => i.out).length,
  };
}

/**
 * Бүтээгдэхүүн тус бүрийн ЗАРЛАГА — тухайн хугацаанд зарагдсан тоо ширхэг.
 * Агуулахын үлдэгдэлтэй хамт харуулахад ашиглана (үлдэгдэл ↔ зарлага).
 * Түлхүүр нь product_id — устгагдсан бараа (product_id null) орохгүй.
 */
export function soldQuantityByProduct(
  orders: ReportOrder[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of orders) {
    for (const i of o.items ?? []) {
      if (!i.product_id) continue;
      map.set(i.product_id, (map.get(i.product_id) ?? 0) + Number(i.quantity ?? 0));
    }
  }
  return map;
}
