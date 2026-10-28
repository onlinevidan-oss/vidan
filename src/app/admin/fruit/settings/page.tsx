import { FruitTopBar } from "@/components/admin/FruitTopBar";
import { FruitImageManager } from "@/components/admin/FruitImageManager";
import { getFruitProductImages } from "@/lib/queries/fruit";

export const dynamic = "force-dynamic";

/** Жимсний хэсгийн тохиргоо — зөвхөн жимсний барааны зураг */
export default async function FruitSettings() {
  const products = await getFruitProductImages();
  return (
    <>
      <FruitTopBar title="Тохиргоо" crumb="Барааны зураг" />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 sm:p-7">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-500">
            Жимсний бараа хараахан нэмэгдээгүй байна.
          </div>
        ) : (
          products.map((p) => <FruitImageManager key={p.id} productId={p.id} name={p.name_mn} images={p.images} />)
        )}
      </div>
    </>
  );
}
