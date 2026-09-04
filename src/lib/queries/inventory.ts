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

  const [{ data: products }, { data: orders }] = await Promise.all([
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
