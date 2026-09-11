import { CartView } from "@/components/customer/CartView";
import { getPublicCommerceSettings } from "@/lib/queries/public-settings";
import { getCurrentStaff } from "@/lib/queries/staff";

export const metadata = { title: "Сагс", robots: { index: false, follow: false } };

export default async function CartPage() {
  const [settings, staff] = await Promise.all([
    getPublicCommerceSettings(),
    getCurrentStaff(),
  ]);
  return <CartView settings={settings} isStaff={!!staff} />;
}
