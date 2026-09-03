import { CartView } from "@/components/customer/CartView";
import { getPublicCommerceSettings } from "@/lib/queries/public-settings";

export const metadata = { title: "Сагс", robots: { index: false, follow: false } };

export default async function CartPage() {
  const settings = await getPublicCommerceSettings();
  return <CartView settings={settings} />;
}
