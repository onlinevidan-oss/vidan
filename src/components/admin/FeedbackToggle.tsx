"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeedbackHandled } from "@/app/admin/(protected)/feedback/actions";

export function FeedbackToggle({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setFeedbackHandled(id, !handled);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          handled
            ? "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-ink-500 transition hover:border-ink-400 disabled:opacity-50"
            : "rounded-[8px] bg-lime-600 px-3 py-1.5 text-[11px] font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-50"
        }
      >
        {pending ? "…" : handled ? "Буцааж нээх" : "✓ Шийдсэн"}
      </button>
      {error && <div className="mt-1 text-[11px] font-semibold text-brand-600">{error}</div>}
    </div>
  );
}
