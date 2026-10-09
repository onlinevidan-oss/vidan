"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaff, updateStaff } from "@/app/admin/(protected)/staff/actions";
import {
  STAFF_ROLES,
  STAFF_ROLE_HINT,
  STAFF_ROLE_LABEL,
  type StaffRole,
} from "@/lib/staff-rules";
import { formatPhone } from "@/lib/utils";

export type StaffListRow = {
  id: string;
  full_name: string;
  phone: string | null;
  /** Утсаар нэвтэрдэг хүний орлуулах хаягийг харуулахгүй — null */
  email: string | null;
  role: string;
  is_active: boolean;
};

const INPUT =
  "w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500";

export function StaffManager({ staff, meId }: { staff: StaffListRow[]; meId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  // Нэмэх маягт
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [addError, setAddError] = useState<string | null>(null);

  function change(id: string, patch: { role?: string; is_active?: boolean }) {
    setRowError(null);
    startTransition(async () => {
      const res = await updateStaff(id, patch);
      if (!res.ok) setRowError({ id, text: res.error });
      // Амжилтгүй бол сонголтыг серверийн утга руу буцаана
      router.refresh();
    });
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    startTransition(async () => {
      const res = await addStaff({ phone, fullName, role });
      if (!res.ok) return setAddError(res.error);
      setPhone("");
      setFullName("");
      setRole("staff");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {open ? (
        <form
          onSubmit={submitAdd}
          className="space-y-3 rounded-2xl border-[1.5px] border-brand-200 bg-white p-5"
        >
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-700">
            Ажилтан нэмэх
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Утасны дугаар
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="8 оронтой дугаар"
                className={INPUT}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Нэр
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                Эрх
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className={INPUT}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {STAFF_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-ink-500">
            Тэр хүн эхлээд vidan.mn-д энэ дугаараараа нэвтэрсэн байх ёстой.
            Нэмсний дараа дахин нэвтрэхэд нь админ хэсэг нээгдэнэ.
          </p>
          {addError && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
              ⚠️ {addError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Нэмж байна…" : "Нэмэх"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setAddError(null);
              }}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:border-ink-400"
            >
              Болих
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-[10px] bg-brand-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_10px_rgba(215,35,39,0.25)] transition hover:bg-brand-700"
        >
          ＋ Ажилтан нэмэх
        </button>
      )}

      <div className="rounded-2xl border border-ink-200 bg-white">
        <ul className="divide-y divide-ink-100">
          {staff.map((s) => {
            const isMe = s.id === meId;
            return (
              <li
                key={s.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${s.is_active ? "" : "opacity-60"}`}
              >
                <div className="min-w-[180px] flex-1">
                  <div className="font-bold text-ink-900">
                    {s.full_name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-lime-700">
                        Та
                      </span>
                    )}
                    {!s.is_active && (
                      <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-ink-500">
                        Идэвхгүй
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-500">
                    {[s.phone ? formatPhone(s.phone) : null, s.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>

                <select
                  value={s.role}
                  disabled={pending || isMe}
                  onChange={(e) => change(s.id, { role: e.target.value })}
                  title={isMe ? "Өөрийнхөө эрхийг өөрчлөх боломжгүй" : undefined}
                  className="rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-brand-500 disabled:bg-ink-100 disabled:text-ink-500"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {STAFF_ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={pending || isMe}
                  onClick={() => change(s.id, { is_active: !s.is_active })}
                  title={isMe ? "Өөрийгөө идэвхгүй болгох боломжгүй" : undefined}
                  className={
                    s.is_active
                      ? "rounded-[8px] border-[1.5px] border-ink-200 bg-white px-3 py-2 text-[11px] font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      : "rounded-[8px] bg-lime-600 px-3 py-2 text-[11px] font-bold text-ink-900 transition hover:bg-lime-700 disabled:opacity-40"
                  }
                >
                  {s.is_active ? "Эрхийг хаах" : "Эрхийг сэргээх"}
                </button>

                {rowError?.id === s.id && (
                  <div className="w-full text-[11px] font-semibold text-brand-600">
                    ⚠️ {rowError.text}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-ink-700">
        <strong className="text-ink-900">Эрхүүд:</strong>
        <ul className="mt-1 space-y-0.5">
          {STAFF_ROLES.map((r) => (
            <li key={r}>
              <strong className="text-ink-900">{STAFF_ROLE_LABEL[r]}</strong> —{" "}
              {STAFF_ROLE_HINT[r]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
