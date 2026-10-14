/**
 * Админд анхаарал хандуулах зүйлсийн тоо — цэсний тэмдэг ба хонхонд.
 *
 * Layout (цэс) болон хуудас бүрийн TopBar (хонх) хоёулаа дуудна. React-ийн
 * `cache` нь нэг хүсэлтийн дотор давтан дуудлагыг нэг болгодог тул сан руу
 * нэг л удаа очно.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getStockCounts } from "@/lib/queries/stock-counts";

export type AdminAlerts = {
  /** Төлөгдсөн, хараахан бэлтгэж эхлээгүй захиалга */
  newOrders: number;
  /** Төлбөр хүлээж буй (хараахан цуцлагдаагүй) захиалга */
  unpaidOrders: number;
  /** Идэвхтэй, үлдэгдэл 1–20 (дахин захиалах) — `stockLevel`-тэй ижил */
  lowStock: number;
  /** Идэвхтэй атлаа дууссан (0) */
  outStock: number;
  /** Шийдээгүй санал хүсэлт */
  openFeedback: number;
};

export const getAdminAlerts = cache(async (): Promise<AdminAlerts> => {
  const supabase = await createClient();
  const [newOrders, unpaidOrders, stock, openFeedback] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .eq("status", "new"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending")
      .neq("status", "cancelled"),
    getStockCounts(),
    supabase
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("is_handled", false),
  ]);
  return {
    newOrders: newOrders.count ?? 0,
    unpaidOrders: unpaidOrders.count ?? 0,
    lowStock: stock.low,
    outStock: stock.out,
    openFeedback: openFeedback.count ?? 0,
  };
});
