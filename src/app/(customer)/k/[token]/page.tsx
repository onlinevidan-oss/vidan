import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ubDateKey } from "@/lib/datetime";

/**
 * Хэвлэмэл хөнгөлөлтийн картын QR → /k/<token> (0049).
 *
 * 300 картад НЭГ л QR хэвлэгддэг тул картыг биш хэрэглэгчийг танина:
 * нэвтэрсэн хүн энэ хуудсыг нээмэгц карт тухайн бүртгэлд холбогдож,
 * дараагийн захиалгад хөнгөлөлт өөрөө хасагдана (place_order).
 * Нэвтрээгүй бол нэвтрээд энд буцаж ирнэ.
 */
export const metadata = { title: "Хөнгөлөлтийн карт", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** "2027-04-30" → "2027.04.30" (УБ өдөр) */
function ubDateDots(iso: string): string {
  return ubDateKey(new Date(iso)).replaceAll("-", ".");
}

export default async function DiscountCardPage({ params }: PageProps<"/k/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("claim_discount_card", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  const status = row?.status ?? "not_found";
  const percent = row?.percent != null ? Number(row.percent) : 5;
  const until = row?.ends_at ? ubDateDots(row.ends_at) : null;

  const content: Record<string, { icon: string; title: string; text: React.ReactNode }> = {
    claimed: {
      icon: "🎉",
      title: `${percent}% хөнгөлөлт идэвхжлээ`,
      text: (
        <>
          Дараагийн захиалгад барааны үнээс <strong>{percent}%</strong> автоматаар
          хасагдана — код оруулах шаардлагагүй.
          {until && <> Хүчинтэй хугацаа: <strong>{until}</strong> хүртэл.</>}
        </>
      ),
    },
    auth: {
      icon: "🎁",
      title: `${percent}% хөнгөлөлтийн карт`,
      text: (
        <>
          Хөнгөлөлтөө идэвхжүүлэхийн тулд утасны дугаараараа нэвтэрнэ үү.
          Нэвтэрмэгц хөнгөлөлт таны бүртгэлд хадгалагдана.
        </>
      ),
    },
    used: {
      icon: "✓",
      title: "Хөнгөлөлтөө ашигласан байна",
      text: <>Энэ картын хөнгөлөлтийг нэг хүн нэг удаа ашиглана. Та аль хэдийн ашигласан байна.</>,
    },
    expired: {
      icon: "⌛",
      title: "Картын хугацаа дууссан",
      text: <>Энэ картын хөнгөлөлтийн хугацаа {until ? `${until}-нд ` : ""}дууссан байна.</>,
    },
    inactive: {
      icon: "⏸",
      title: "Хөнгөлөлт түр зогссон",
      text: <>Энэ картын хөнгөлөлт одоогоор идэвхгүй байна.</>,
    },
    not_found: {
      icon: "?",
      title: "Карт олдсонгүй",
      text: <>QR кодыг дахин уншуулна уу.</>,
    },
  };
  const c = content[status] ?? content.not_found;

  return (
    <div className="my-10 grid grid-cols-1 place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border-[1.5px] border-ink-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-3xl text-brand-700">
          {c.icon}
        </div>
        <h1 className="font-display mb-2 text-xl font-extrabold text-ink-900">{c.title}</h1>
        <p className="text-sm leading-relaxed text-ink-700">{c.text}</p>

        {status === "auth" ? (
          <Link
            href={`/login?next=${encodeURIComponent(`/k/${token}`)}`}
            className="mt-6 block rounded-[12px] bg-brand-600 py-3.5 text-base font-extrabold text-white transition hover:bg-brand-700"
          >
            Нэвтэрч идэвхжүүлэх
          </Link>
        ) : (
          <Link
            href="/products"
            className="mt-6 block rounded-[12px] bg-brand-600 py-3.5 text-base font-extrabold text-white transition hover:bg-brand-700"
          >
            Бараа сонгох
          </Link>
        )}
      </div>
    </div>
  );
}
