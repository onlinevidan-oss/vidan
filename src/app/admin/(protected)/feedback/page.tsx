import Link from "next/link";
import { TopBar } from "@/components/admin/TopBar";
import { FeedbackToggle } from "@/components/admin/FeedbackToggle";
import { createClient } from "@/lib/supabase/server";
import { formatPhone } from "@/lib/utils";
import { formatUbDateTime } from "@/lib/datetime";

export const metadata = { title: "Санал хүсэлт | VIDAN Backoffice" };
export const dynamic = "force-dynamic";

const CATEGORY: Record<string, { label: string; cls: string }> = {
  suggestion: { label: "Санал", cls: "bg-[#e8f1fc] text-[#2e7eda]" },
  complaint: { label: "Гомдол", cls: "bg-brand-100 text-brand-700" },
  praise: { label: "Талархал", cls: "bg-lime-100 text-lime-700" },
  other: { label: "Бусад", cls: "bg-ink-100 text-ink-700" },
};

/** Нэг дор харуулах дээд тоо — хамгийн шинэ нь эхэндээ */
const LIMIT = 200;

export default async function AdminFeedback({
  searchParams,
}: PageProps<"/admin/feedback">) {
  const sp = await searchParams;
  const showAll = sp.view === "all";

  const supabase = await createClient();
  let q = supabase
    .from("feedback")
    .select("id, name, phone, category, message, is_handled, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (!showAll) q = q.eq("is_handled", false);

  const [{ data: rows }, { count: open }, { count: total }] = await Promise.all([
    q,
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("is_handled", false),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
  ]);
  const list = rows ?? [];

  return (
    <>
      <TopBar title="Санал хүсэлт" crumb={showAll ? "Бүгд" : "Шийдээгүй"} />
      <div className="flex-1 p-4 sm:p-7">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Санал хүсэлт
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            Хэрэглэгчид сайтаас илгээсэн санал, гомдол, талархал
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Chip href="/admin/feedback" active={!showAll} label={`Шийдээгүй (${open ?? 0})`} />
          <Chip href="/admin/feedback?view=all" active={showAll} label={`Бүгд (${total ?? 0})`} />
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white">
          {list.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <div className="mb-3 text-4xl opacity-40">💬</div>
              <div className="font-display text-base font-bold text-ink-700">
                {showAll ? "Санал хүсэлт ирээгүй байна" : "Шийдээгүй санал хүсэлт алга"}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {list.map((f) => {
                const cat = CATEGORY[f.category] ?? CATEGORY.other;
                return (
                  <li key={f.id} className={`flex items-start gap-4 px-5 py-4 ${f.is_handled ? "opacity-60" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cat.cls}`}>
                          {cat.label}
                        </span>
                        <span className="font-bold text-ink-900">{f.name || "Нэргүй"}</span>
                        {f.phone && (
                          <a href={`tel:${f.phone.replace(/\D/g, "")}`} className="font-bold text-brand-700">
                            📞 {formatPhone(f.phone)}
                          </a>
                        )}
                        <span className="text-[11px] text-ink-500">
                          {formatUbDateTime(f.created_at, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700">
                        {f.message}
                      </p>
                    </div>
                    <FeedbackToggle id={f.id} handled={f.is_handled} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {list.length === LIMIT && (
          <div className="mt-3 text-center text-[11px] text-ink-500">
            Сүүлийн {LIMIT} санал хүсэлт харагдаж байна
          </div>
        )}
      </div>
    </>
  );
}

function Chip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white"
          : "rounded-full border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
      }
    >
      {label}
    </Link>
  );
}
