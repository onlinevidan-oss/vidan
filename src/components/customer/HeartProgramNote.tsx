/**
 * "ХҮРЭН ЗҮРХ" үндэсний хөтөлбөрийн мэдэгдэл.
 * Хүрэн манжингийн бүтээгдэхүүн (products.heart_program = true) худалдан
 * авахад ширхэг тутмаас 30₮ "Зүрх мартахгүй" төсөлд хандивлагдана.
 */

/** Ширхэг тутмаас хандивлагдах дүн (₮) */
export const HEART_DONATION_PER_ITEM = 30;

export function HeartProgramNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 rounded-[10px] border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] leading-snug text-brand-900">
        <span aria-hidden>❤️</span>
        <span>
          <strong className="font-extrabold">ХҮРЭН ЗҮРХ</strong> хөтөлбөр —
          ширхэг тутмаас {HEART_DONATION_PER_ITEM}₮ “Зүрх мартахгүй” төсөлд
          хандивлагдана
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-brand-200 bg-brand-50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          ❤️
        </span>
        <div>
          <div className="font-display text-[13px] font-extrabold uppercase tracking-wide text-brand-700">
            Хүрэн зүрх үндэсний хөтөлбөр
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
            Таны худалдан авсан бүтээгдэхүүн бүрийн{" "}
            <strong className="text-ink-900">
              {HEART_DONATION_PER_ITEM}₮
            </strong>{" "}
            “Зүрх мартахгүй” төсөлд хандивлагдах болно.
          </p>
        </div>
      </div>
    </div>
  );
}
