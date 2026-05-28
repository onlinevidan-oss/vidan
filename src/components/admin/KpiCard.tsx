import { cn } from "@/lib/utils";

type Tone = "brand" | "lime" | "info" | "warn";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: "bg-brand-100",   fg: "text-brand-600" },
  lime:  { bg: "bg-lime-100",    fg: "text-lime-700" },
  info:  { bg: "bg-[#e8f1fc]",   fg: "text-[#2e7eda]" },
  warn:  { bg: "bg-[#fdf2dc]",   fg: "text-[#e89823]" },
};

export function KpiCard({
  label,
  value,
  delta,
  trend,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon: string;
  tone?: Tone;
}) {
  const tones = TONE_STYLES[tone];
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          {label}
        </div>
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-[10px] text-base",
            tones.bg,
            tones.fg,
          )}
        >
          {icon}
        </div>
      </div>
      <div className="font-display text-[26px] font-black leading-none tracking-tight text-ink-900">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "mt-1.5 text-xs font-semibold",
            trend === "up" && "text-[#2da764]",
            trend === "down" && "text-brand-600",
            trend === "flat" && "text-ink-500",
          )}
        >
          {trend === "up" && "↑ "}
          {trend === "down" && "↓ "}
          {delta}
        </div>
      )}
    </div>
  );
}
