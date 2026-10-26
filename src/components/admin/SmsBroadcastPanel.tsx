"use client";

/**
 * Масс SMS — бүртгэлтэй бүх дугаар руу хуваарьт цагт (0047).
 * Эхлээд "Туршилт" товчоор админы дугаар руу нэг SMS явуулж шалгана.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBroadcast,
  scheduleBroadcast,
  sendBroadcastTest,
} from "@/app/admin/(protected)/settings/actions";
import { smsSegments } from "@/lib/sms/recipients";

export type BroadcastRow = {
  id: string;
  text: string;
  send_at: string;
  status: string;
  recipients: number | null;
  sent: number;
  failed: number;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Хүлээгдэж байна", cls: "bg-[#fff3d6] text-[#9a6200]" },
  sending: { label: "Илгээж байна", cls: "bg-lime-100 text-lime-700" },
  sent: { label: "Илгээгдсэн", cls: "bg-lime-100 text-lime-700" },
  cancelled: { label: "Цуцалсан", cls: "bg-ink-100 text-ink-500" },
};

/** "Да 10.26 19:00" — УБ цаг, браузерийн хэлнээс үл хамаарна */
function when(iso: string): string {
  const d = new Date(Date.parse(iso) + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  const day = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"][d.getUTCDay()];
  return `${day} ${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const INPUT =
  "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500";

export function SmsBroadcastPanel({
  rows,
  recipients,
  today,
}: {
  rows: BroadcastRow[];
  /** Одоогийн хүлээн авагчийн тоо */
  recipients: number;
  /** УБ өдөр "YYYY-MM-DD" */
  today: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("19:00");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const seg = text.trim() ? smsSegments(text.trim()) : 0;

  function run(fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, okText: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error ?? "Алдаа" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-ink-700">
          Текст
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Захиалга хийгээд азтан болоорой! Дэлгэрэнгүй: https://…"
            className={`mt-1 w-full ${INPUT}`}
          />
        </label>
        <div className="mt-1 text-[11px] text-ink-500">
          {text.trim().length + 6} тэмдэгт (« VIDAN»-тай) · {seg} хэсэг · {recipients} дугаар →{" "}
          <strong className="text-ink-900">{seg * recipients} SMS</strong> нэг илгээлтэд
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-700">
          Огноо
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 block ${INPUT}`} />
        </label>
        <label className="text-xs text-ink-700">
          Цаг (УБ)
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`mt-1 block ${INPUT}`} />
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => scheduleBroadcast({ text, date, time }), "Хуваарьт нэмлээ")}
          className="rounded-[8px] bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          Хуваарьт нэмэх
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => sendBroadcastTest(text), "Туршилтын SMS явлаа — утсаа шалгана уу")}
          className="rounded-[8px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 disabled:opacity-60"
        >
          Туршилт (админы дугаар руу)
        </button>
      </div>
      {msg && (
        <div className={`text-xs font-semibold ${msg.ok ? "text-lime-700" : "text-brand-700"}`}>
          {msg.ok ? "✓" : "⚠️"} {msg.text}
        </div>
      )}

      {rows.length > 0 && (
        <div className="divide-y divide-ink-100 rounded-[10px] border border-ink-200">
          {rows.map((r) => {
            const st = STATUS[r.status] ?? { label: r.status, cls: "bg-ink-100 text-ink-500" };
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                <span className="w-[110px] shrink-0 font-bold tabular-nums text-ink-900">{when(r.send_at)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                <span className="text-[12px] text-ink-500">
                  {r.status === "scheduled"
                    ? `${recipients} дугаар`
                    : `${r.sent}/${r.recipients ?? "—"} илгээгдсэн${r.failed ? ` · ${r.failed} амжилтгүй` : ""}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink-500" title={r.text}>
                  {r.text}
                </span>
                {r.status === "scheduled" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`${when(r.send_at)}-ийн илгээлтийг цуцлах уу?`)) {
                        run(() => cancelBroadcast(r.id), "Цуцаллаа");
                      }
                    }}
                    className="text-[12px] font-bold text-brand-700 hover:underline"
                  >
                    Цуцлах
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
