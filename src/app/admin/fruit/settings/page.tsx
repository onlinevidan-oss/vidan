import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { FruitImageManager } from "@/components/admin/FruitImageManager";
import { FruitBannerManager } from "@/components/admin/FruitBannerManager";
import { getFruitProductImages } from "@/lib/queries/fruit";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRUIT_BANNER_DEFAULT, FRUIT_BANNER_MAX, fruitBannerUrls } from "@/lib/queries/public-settings";

export const dynamic = "force-dynamic";

/** Жимсний хэсгийн тохиргоо — "Жимс" хуудасны баннер ба барааны зураг */
export default async function FruitSettings() {
  const admin = createAdminClient();
  const [products, { data: banner }] = await Promise.all([
    getFruitProductImages(),
    admin.from("site_settings").select("value").eq("key", "fruit_banner").maybeSingle(),
  ]);
  const bannerUrls = fruitBannerUrls(banner?.value);
  // Нөөц (POOL-*) бараанд зураг хэрэггүй
  const sellable = products.filter((p) => !p.sku?.startsWith("POOL-"));
  return (
    <>
      <FruitTopBar title="Тохиргоо" crumb="Баннер, барааны зураг" />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 sm:p-7">
        <FruitBannerManager urls={bannerUrls} defaultUrl={FRUIT_BANNER_DEFAULT} max={FRUIT_BANNER_MAX} />
        <h2 className="pt-2 text-sm font-bold uppercase tracking-wide text-ink-500">Барааны зураг</h2>
        {sellable.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">
            Жимсний бараа хараахан нэмэгдээгүй байна.
          </div>
        ) : (
          sellable.map((p) => <FruitImageManager key={p.id} productId={p.id} name={p.name_mn} images={p.images} />)
        )}
      </div>
    </>
  );
}
