/**
 * Хайлтын санал (typeahead) — header-ийн хайлтын талбар бичиж байхад дуудна.
 * Зөвхөн уншина, нэвтрэх шаардлагагүй (бүтээгдэхүүн нийтэд нээлттэй).
 */
import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/queries/products";

const LIMIT = 6;

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (term.length < 1) return NextResponse.json({ items: [] });
  if (term.length > 60) return NextResponse.json({ items: [] });

  try {
    const products = await searchProducts(term, LIMIT);

    const items = products.map((p) => {
      const images = [...(p.images ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      return {
        slug: p.slug,
        name: p.name_mn,
        price: Number(p.price ?? 0),
        image: images[0]?.url ?? null,
      };
    });

    return NextResponse.json(
      { items },
      // Ижил үгийг богино хугацаанд дахин бичихэд DB-д дахин очихгүй
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
