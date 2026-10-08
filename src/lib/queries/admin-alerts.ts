/**
 * Админд анхаарал хандуулах зүйлсийн тоо — цэсний тэмдэг ба хонхонд.
 *
 * Layout (цэс) болон хуудас бүрийн TopBar (хонх) хоёулаа дуудна. React-ийн
 * `cache` нь нэг хүсэлтийн дотор давтан дуудлагыг нэг болгодог тул сан руу
 * нэг л удаа очно.
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AdminAlerts = {
  /** Төлөгдсөн, хараахан бэлтгэж эхлээгүй захиалга */
  newOrders: number;
  /** Төлбөр хүлээж буй (хараахан цуцлагдаагүй) захиалга */
  unpaidOrders: number;
  /** Идэвхтэй бараанаас үлдэгдэл 20 ба түүнээс доош */
  lowStock: number;
  /** Шийдээгүй санал хүсэлт */
  openFeedback: number;
};

export const getAdminAlerts = cache(async (): Promise<AdminAlerts> => {
  const supabase = await createClient();
  const [newOrders, unpaidOrders, lowStock, openFeedback] = await Promise.all([
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
    // Хяналтын самбарын "Дуусч буй нөөц"-тэй ижил дүрэм
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .lte("stock", 20),
    supabase
      .from("feedback")
      .select("id", { count: "exact", head: true })
      .eq("is_handled", false),
  ]);
  return {
    newOrders: newOrders.count ?? 0,
    unpaidOrders: unpaidOrders.count ?? 0,
    lowStock: lowStock.count ?? 0,
    openFeedback: openFeedback.count ?? 0,
  };
});
