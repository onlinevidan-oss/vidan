"use client";

import Link from "next/link";
import {
  PRESET_LABEL,
  REPORT_PRESETS,
  type PeriodPreset,
  type ReportPeriod,
} from "@/lib/report-period";

/**
 * Тайлангийн хугацаа сонгох ба хэвлэх мөр.
 *
 * Хугацаа нь URL-д хадгалагдана (`?preset=` эсвэл `?from=&to=`) — ингэснээр
 * санхүүд өгсөн тайлангийн холбоосыг дахин нээж, яг тэр тоог харах боломжтой.
 */
export function ReportToolbar({
  period,
  basePath = "/admin/reports",
  presets = REPORT_PRESETS,
}: {
  period: ReportPeriod;
  /** Аль хуудсанд байгаа — сонголт дарахад энэ зам руу очно */
  basePath?: string;
  presets?: readonly PeriodPreset[];
}) {
  return (
    <div className="print-hide space-y-3 rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
          Хугацаа
        </span>
        {presets.map((p) => {
          const active = period.preset === p;
          return (
            <Link
              key={p}
              href={`${basePath}?preset=${p}`}
              className={[
                "rounded-[10px] border-[1.5px] px-3 py-1.5 text-xs font-bold transition",
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:border-brand-500 hover:text-brand-700",
              ].join(" ")}
            >
              {PRESET_LABEL[p]}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-ink-100 pt-3">
        <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Эхлэх
            </span>
            <input
              type="date"
              name="from"
              defaultValue={period.from}
              required
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[13px] outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              Дуусах
            </span>
            <input
              type="date"
              name="to"
              defaultValue={period.to}
              required
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[13px] outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
            />
          </label>
          <button
            type="submit"
            className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
          >
            Харах
          </button>
        </form>

        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto rounded-[10px] bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          🖨 Хэвлэх / PDF болгох
        </button>
      </div>
    </div>
  );
}
