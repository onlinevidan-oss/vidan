/**
 * Агуулахын үлдэгдлийн query — зурагтай, зарлагатай.
 *
 * Тайлангийн query-ээс тусад нь: энд орлогын график, ангилал, төлбөрийн
 * задаргаа хэрэггүй тул "Бүх хугацаа" сонголтод ч хөнгөн ажиллана.
 */
import { createClient } from "@/lib/supabase/server";
import { soldQuantityByProduct, type ReportOrder } from "@/lib/report-aggregate";
import { periodToUtcRange, type ReportPeriod } from "@/lib/report-period";

export type InventoryRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string | null;
  /** Агуулахын үлдэгдэл */
  stock: number;
  /** Сонгосон хугацаанд зарагдсан тоо ширхэг */
  sold: number;
  price: number;
  /** Үлдэгдлийн дүн, зарах үнээр */
  value: number;
  low: boolean;
  out: boolean;
};

export type InventoryData = {
  period: ReportPeriod;
  rows: InventoryRow[];
  /**
   * Орлого/зарлагын бүртгэл идэвхтэй эсэх — migration 0028 ажилласан бол true.
   * Ажиллаагүй үед орлого нэмэх товчийг нуухад ашиглана (дарвал алдаа өгөхөөс).
   */
  ledgerReady: boolean;
  totals: {
    skuCount: number;
    units: number;
    value: number;
    sold: number;
    lowCount: number;
    outCount: number;
  };
};

export async function getInventory(period: ReportPeriod): Promise<InventoryData> {
  const supabase = await createClient();
  const { since, until } = periodToUtcRange(period);

  const [{ data: products }, { data: orders }, ledger] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name_mn, sku, stock, price, stock_threshold, " +
          "category:categories(name_mn), images:product_images(url, sort_order)",
      )
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("items:order_items(product_id, quantity)")
      .gte("created_at", since.toISOString())
      .lt("created_at", until.toISOString())
      .eq("payment_status", "paid")
      .neq("status", "cancelled"),
    // head:true нь байхгүй хүснэгтэд ч 204 буцаадаг тул энгийн select-ээр шалгана
    supabase.from("stock_movements").select("id").limit(1),
  ]);

  const soldMap = soldQuantityByProduct((orders ?? []) as unknown as ReportOrder[]);

  type ProductRow = {
    id: string;
    name_mn: string;
    sku: string;
    stock: number;
    price: number;
    stock_threshold: number;
    category: { name_mn: string } | null;
    images: { url: string; sort_order: number | null }[] | null;
  };

  const rows: InventoryRow[] = ((products ?? []) as unknown as ProductRow[]).map(
    (p) => {
      const stock = Number(p.stock ?? 0);
      const price = Number(p.price ?? 0);
      const firstImage = [...(p.images ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      )[0]?.url;
      return {
        id: p.id,
        name: p.name_mn,
        sku: p.sku,
        category: p.category?.name_mn ?? "—",
        imageUrl: firstImage ?? null,
        stock,
        sold: soldMap.get(p.id) ?? 0,
        price,
        value: stock * price,
        low: stock > 0 && stock <= Number(p.stock_threshold ?? 0),
        out: stock <= 0,
      };
    },
  );

  // Үлдэгдэл цөөрснөөр — дуусах дөхсөн бараа эхэнд харагдана
  rows.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "mn"));

  return {
    period,
    rows,
    ledgerReady: !ledger.error,
    totals: {
      skuCount: rows.length,
      units: rows.reduce((s, r) => s + r.stock, 0),
      value: rows.reduce((s, r) => s + r.value, 0),
      sold: rows.reduce((s, r) => s + r.sold, 0),
      lowCount: rows.filter((r) => r.low).length,
      outCount: rows.filter((r) => r.out).length,
    },
  };
}

export type StockMovement = {
  id: string;
  productName: string;
  sku: string;
  kind: "in" | "out" | "adjust";
  quantity: number;
  note: string | null;
  occurredAt: string;
  orderId: string | null;
};

export type MovementsResult =
  | { ready: true; rows: StockMovement[]; totalIn: number; totalOut: number }
  /** Migration 0028 хараахан ажиллаагүй — хүснэгт байхгүй */
  | { ready: false; error: string };

/** Орлого, зарлагын түүх — шинэхнээс нь */
export async function getStockMovements(limit = 300): Promise<MovementsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, kind, quantity, note, occurred_at, order_id, product:products(name_mn, sku)")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return { ready: false, error: error.message };

  type Row = {
    id: string;
    kind: "in" | "out" | "adjust";
    quantity: number;
    note: string | null;
    occurred_at: string;
    order_id: string | null;
    product: { name_mn: string; sku: string } | null;
  };

  const rows: StockMovement[] = ((data ?? []) as unknown as Row[]).map((m) => ({
    id: m.id,
    productName: m.product?.name_mn ?? "—",
    sku: m.product?.sku ?? "—",
    kind: m.kind,
    quantity: Number(m.quantity),
    note: m.note,
    occurredAt: m.occurred_at,
    orderId: m.order_id,
  }));

  return {
    ready: true,
    rows,
    totalIn: rows.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity, 0),
    totalOut: rows.filter((r) => r.quantity < 0).reduce((s, r) => s + r.quantity, 0),
  };
}
