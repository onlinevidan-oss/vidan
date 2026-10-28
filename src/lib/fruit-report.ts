/**
 * Vidan fruit-ийн тайлан — цэвэр функц (DB-д хүрэхгүй).
 *
 * Холимог захиалгад (жимс + VIDAN-ы шил) зөвхөн ЖИМСНИЙ мөрийг тооцно —
 * хоёр компани тооцоогоо "хэдэн ширхэг, хэдэн төгрөгийн жимс" гэдгээр
 * тулна. VIDAN-ы бараа, хүргэлт энд орохгүй.
 */

export type FruitSaleItem = {
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
};

export type FruitSaleOrder = {
  id: string;
  user_id: string | null;
  items: FruitSaleItem[];
};

export type FruitProductSales = {
  name: string;
  sku: string | null;
  quantity: number;
  revenue: number;
};

export type FruitSalesSummary = {
  /** Жимс орсон захиалгын тоо */
  orders: number;
  /** Жимсний ширхэг (хайрцаг) */
  quantity: number;
  /** Жимсний борлуулалт (мөрийн нийлбэр) */
  revenue: number;
  /** Худалдан авсан хэрэглэгч */
  customers: number;
  byProduct: FruitProductSales[];
};

export function summarizeFruitSales(
  orders: FruitSaleOrder[],
  fruitProductIds: Set<string>,
): FruitSalesSummary {
  const byProduct = new Map<string, FruitProductSales>();
  const orderIds = new Set<string>();
  const customers = new Set<string>();

  for (const o of orders) {
    for (const it of o.items) {
      if (!it.product_id || !fruitProductIds.has(it.product_id)) continue;
      orderIds.add(o.id);
      if (o.user_id) customers.add(o.user_id);
      const row = byProduct.get(it.product_id) ?? {
        name: it.product_name,
        sku: it.product_sku,
        quantity: 0,
        revenue: 0,
      };
      row.quantity += it.quantity;
      row.revenue += Number(it.unit_price) * it.quantity;
      byProduct.set(it.product_id, row);
    }
  }

  const list = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  return {
    orders: orderIds.size,
    quantity: list.reduce((s, p) => s + p.quantity, 0),
    revenue: list.reduce((s, p) => s + p.revenue, 0),
    customers: customers.size,
    byProduct: list,
  };
}
