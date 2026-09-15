/**
 * Тайлангийн тоо нэгтгэлт — цэвэр функцууд (DB-д хүрэхгүй).
 *
 * Эдгээр тоо САНХҮҮД өгөгддөг тул тусад нь тестлэгдэх ёстой. Query давхарга
 * (`queries/reports.ts`) нь зөвхөн өгөгдөл татаж, эндэх функцуудыг дуудна.
 */

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
  /** НӨАТ */
  tax: number;
  /** Нийт (= netGoods + shipping + tax) */
  total: number;
  orders: number;
  avgOrder: number;
};

export function summarizeFinance(orders: ReportOrder[]): FinanceSummary {
  const n = (v: unknown) => Number(v ?? 0);
  const acc = orders.reduce(
    (s, o) => {
      s.goods += n(o.subtotal);
      s.discount += n(o.discount);
      s.shipping += n(o.shipping);
      s.tax += n(o.tax);
      s.total += n(o.total);
      if (n(o.shipping) > 0) s.deliveries += 1;
      return s;
    },
    { goods: 0, discount: 0, shipping: 0, tax: 0, total: 0, deliveries: 0 },
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

// ============================================================
// Агуулах — орлого, зарлага, үлдэгдэл
// ============================================================
export type StockMovementRow = {
  kind: "in" | "out" | "adjust";
  /** Тэмдэгтэй: орлого +, зарлага − */
  quantity: number;
  /** Захиалгатай холбоотой эсэх (борлуулалт/буцаалт) */
  order_id: string | null;
  product?: { name_mn: string; sku: string | null } | null;
};

/** Бараа тус бүрийн орлого */
export type IntakeRow = {
  name: string;
  sku: string | null;
  /** Хэдэн удаа орлогодсон */
  times: number;
  /** Нийт хэдэн ширхэг */
  qty: number;
};

export type WarehouseSummary = {
  /** Нийт хэдэн удаа орлого хийсэн */
  intakeTimes: number;
  /** Орлогын нийт тоо ширхэг */
  intakeQty: number;
  /** Бараа тус бүрээр — их орлоготойгоос нь */
  intakeByProduct: IntakeRow[];
  /** Зарагдсан цэвэр тоо ширхэг (цуцлагдаж буцсаныг хассан) */
  soldQty: number;
  /** Тооллогын засвар (тэмдэгтэй) */
  adjustedQty: number;
  /** Одоогийн үлдэгдэл */
  stockQty: number;
};

/**
 * Агуулахын хөдөлгөөнийг санхүүд ойлгомжтой гурван тоо болгоно:
 * хэдэн удаа юу орлогодсон · хэд зарагдсан · одоо хэд үлдсэн.
 *
 * Орлого гэдэгт зөвхөн агуулахаас хүлээж авсныг тооцно —
 * цуцлагдсан захиалгын нөөц сэргээлт (order_id-тай) орлого биш.
 */
export function summarizeWarehouse(
  movements: StockMovementRow[],
  currentStock: number,
): WarehouseSummary {
  const byProduct = new Map<string, IntakeRow>();
  let intakeTimes = 0;
  let intakeQty = 0;
  let soldQty = 0;
  let adjustedQty = 0;

  for (const m of movements) {
    const q = Number(m.quantity) || 0;
    if (m.kind === "in" && !m.order_id) {
      intakeTimes += 1;
      intakeQty += q;
      const name = m.product?.name_mn ?? "—";
      const row = byProduct.get(name) ?? {
        name,
        sku: m.product?.sku ?? null,
        times: 0,
        qty: 0,
      };
      row.times += 1;
      row.qty += q;
      byProduct.set(name, row);
    } else if (m.kind === "adjust") {
      adjustedQty += q;
    } else if (m.order_id) {
      // Захиалгаар гарсан хасах цуцлагдаж буцаж ирсэн = цэвэр борлуулалт
      soldQty += -q;
    }
  }

  return {
    intakeTimes,
    intakeQty,
    intakeByProduct: [...byProduct.values()].sort(
      (a, b) => b.qty - a.qty || a.name.localeCompare(b.name, "mn"),
    ),
    soldQty,
    adjustedQty,
    stockQty: currentStock,
  };
}
