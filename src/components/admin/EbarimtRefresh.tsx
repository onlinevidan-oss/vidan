"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshEbarimtAmounts } from "@/app/admin/(protected)/ebarimt/actions";

/** "QPay-ээс шалгах" — жагсаалтын баримтуудын бодит дүнг дахин уншина */
export function EbarimtRefresh({ orderIds }: { orderIds: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const res = await refreshEbarimtAmounts(orderIds);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      setMsg({
        ok: res.failed === 0,
        text:
          `${res.updated} баримтыг QPay-ээс шалгалаа` +
          (res.failed ? ` · ${res.failed} нь уншигдсангүй` : "") +
          (res.skipped ? ` · ${res.skipped} нь дараагийн удаа` : ""),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={run}
        disabled={pending || orderIds.length === 0}
        className="rounded-[10px] bg-ink-900 px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-ink-700 disabled:opacity-50"
      >
        {pending ? "QPay-ээс уншиж байна…" : "↻ QPay-ээс шалгах"}
      </button>
      {msg && (
        <span
          className={`text-xs font-semibold ${msg.ok ? "text-lime-700" : "text-brand-700"}`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
