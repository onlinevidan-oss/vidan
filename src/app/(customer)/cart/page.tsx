import { CartView } from "@/components/customer/CartView";
import { getPublicCommerceSettings } from "@/lib/queries/public-settings";
import { getCurrentStaff } from "@/lib/queries/staff";
import { isFruitRole } from "@/lib/staff-rules";
import { getFruitProductIdsPublic } from "@/lib/queries/fruit-public";

export const metadata = { title: "Сагс", robots: { index: false, follow: false } };

export default async function CartPage() {
  const [settings, staff, fruitIds] = await Promise.all([
    getPublicCommerceSettings(),
    getCurrentStaff(),
    getFruitProductIdsPublic(),
  ]);
  return (
    <CartView settings={settings} isStaff={!!staff && !isFruitRole(staff.role)} fruitIds={fruitIds} />
  );
}
