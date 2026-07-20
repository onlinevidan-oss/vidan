import { CartView } from "@/components/customer/CartView";
import { getCommerceSettings } from "@/lib/queries/settings";

export const metadata = { title: "Сагс | VIDAN" };

export default async function CartPage() {
  const settings = await getCommerceSettings();
  return <CartView settings={settings} />;
}
