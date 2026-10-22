import Link from "next/link";
import { formatUbDateTime } from "@/lib/datetime";
import { STAFF_ROLE_LABEL, type StaffRole } from "@/lib/staff-rules";

export type ActivityRow = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  summary: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
};

export type ActivityPerson = {
  id: string;
  full_name: string;
  role: string;
  last_login_at: string | null;
};

const roleLabel = (r: string | null) => (r ? STAFF_ROLE_LABEL[r as StaffRole] ?? r : "");

/** Холбоос — захиалга, бараа руу шууд очно */
function entityHref(r: ActivityRow): string | null {
  if (!r.entity_id) return null;
  if (r.entity_type === "order") return `/admin/orders/${r.entity_id}`;
  if (r.entity_type === "product") return `/admin/products/${r.entity_id}`;
  return null;
}

const DT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Ажилтны үйлдлийн түүх — хэн, ямар эрхээр, юу хийсэн. Хүнээр шүүнэ.
 * Нэр, эрх нь тухайн үйлдэл хийх үеийнх (сан бичих үедээ хадгалсан).
 */
export function StaffActivityLog({
  rows,
  people,
  selected,
}: {
  rows: ActivityRow[];
  people: ActivityPerson[];
  selected: string | null;
}) {
  const chip = (active: boolean) =>
    `rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-bold transition ${
      active
        ? "border-brand-600 bg-brand-50 text-brand-700"
        : "border-ink-200 bg-white text-ink-700 hover:border-brand-300"
    }`;

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 bg-white">
      <div className="border-b border-ink-200 px-5 py-4">
        <h3 className="font-display text-[15px] font-extrabold">Хэн юу хийсэн</h3>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-ink-100 px-5 py-3">
        <Link href="/admin/staff" scroll={false} className={chip(!selected)}>
          Бүгд
        </Link>
        {people.map((p) => (
          <Link
            key={p.id}
            href={`/admin/staff?who=${p.id}`}
            scroll={false}
            className={chip(selected === p.id)}
            title={p.last_login_at ? `Сүүлд орсон: ${formatUbDateTime(p.last_login_at, DT)}` : "Бүртгэлтэй орж үзээгүй"}
          >
            {p.full_name}
            <span className="ml-1 font-normal text-ink-500">· {roleLabel(p.role)}</span>
            <span className="ml-1.5 font-normal text-ink-400">
              {p.last_login_at ? formatUbDateTime(p.last_login_at, DT) : "—"}
            </span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-500">Бүртгэл алга</div>
      ) : (
        <div className="divide-y divide-ink-100">
          {rows.map((r) => {
            const href = entityHref(r);
            return (
              <div key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-2.5 text-[13px]">
                <span className="w-[118px] shrink-0 tabular-nums text-[12px] text-ink-500">
                  {formatUbDateTime(r.created_at, DT)}
                </span>
                <span className="shrink-0 font-bold text-ink-900">
                  {r.actor_name ?? "—"}
                  {r.actor_role && (
                    <span className="ml-1 font-normal text-ink-500">({roleLabel(r.actor_role)})</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 text-ink-700">
                  {href ? (
                    <Link href={href} className="hover:text-brand-700 hover:underline">
                      {r.summary}
                    </Link>
                  ) : (
                    r.summary
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
