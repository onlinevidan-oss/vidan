import { Header } from "@/components/customer/Header";
import { Footer } from "@/components/customer/Footer";
import { getPublicCommerceSettings } from "@/lib/queries/public-settings";
import { formatMnt } from "@/lib/utils";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const commerce = await getPublicCommerceSettings();
  return (
    <>
      <div className="bg-brand-700 px-5 py-2 text-center text-[13px] text-white">
        {formatMnt(commerce.min_order_amount)}-с дээш захиалгад хүргэлттэй
        {commerce.free_shipping_enabled &&
          ` · ${formatMnt(commerce.free_shipping_min)}-с дээш бол хүргэлт үнэгүй`}
      </div>
      <Header />
      <main className="mx-auto w-full max-w-[1240px] px-5 flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
