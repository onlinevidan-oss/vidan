"use client";

/**
 * "Миний мэдээлэл" — хэрэглэгч өөрийн мэдээллээ бүртгэнэ.
 * Төрсөн огноог нэг удаа бөглөнө (төрсөн өдрийн урамшуулалд ашиглагдана).
 */

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadAvatar } from "@/lib/storage";
import { updateProfile } from "@/app/(customer)/account/actions";

export type ProfileInitial = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
};

/** Профайлд утас "97694070800" гэж хадгалагддаг — 8 орон болгоно */
function toLocalPhone(raw: string | null): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("976")) d = d.slice(3);
  return /^[6-9]\d{7}$/.test(d) ? d : "";
}

/** Нэр/овог тусад нь бөглөөгүй хуучин хэрэглэгчид full_name-ээс салгана */
function splitFullName(full: string | null): { first: string; last: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { last: parts[0], first: parts.slice(1).join(" ") };
}

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const fallback = splitFullName(initial.full_name);
  const [firstName, setFirstName] = useState(initial.first_name ?? fallback.first);
  const [lastName, setLastName] = useState(initial.last_name ?? fallback.last);
  const [gender, setGender] = useState<"male" | "female" | "">(
    (initial.gender as "male" | "female" | null) ?? "",
  );
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(() => toLocalPhone(initial.phone));
  const [birthDate, setBirthDate] = useState(initial.birth_date ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Нэг удаа хадгалсан бол цаашид түгжигдэнэ
  const birthLocked = !!initial.birth_date;

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Зураг 2MB-аас бага байх ёстой");
      return;
    }
    setUploading(true);
    setError("");
    const res = await uploadAvatar(file, initial.id);
    if (res.ok) setAvatarUrl(res.url);
    else setError(res.error);
    setUploading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        gender,
        email,
        phone,
        birth_date: birthDate,
        avatar_url: avatarUrl,
      });
      if (res.ok) setSaved(true);
      else setError(res.error);
    });
  }

  const initials =
    (firstName || lastName || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-ink-200 bg-white p-6 md:p-8">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
        Миний мэдээлэл
      </h2>

      {/* Профайлын зураг */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-lime-100">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={80}
              height={80}
              unoptimized={avatarUrl.startsWith("http")}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-display text-2xl font-black text-lime-700">
              {initials}
            </span>
          )}
        </div>
        <div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-[10px] border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 disabled:opacity-50"
            >
              {uploading ? "Байршуулж байна…" : "Зураг солих"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="rounded-[10px] px-4 py-2 text-sm font-bold text-ink-500 transition hover:text-brand-700"
              >
                Устгах
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            JPG, PNG эсвэл WEBP. Дээд тал нь 2MB.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatar}
            className="hidden"
          />
        </div>
      </div>

      <div className="my-6 h-px bg-ink-100" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Нэр" required value={firstName} onChange={setFirstName} />
        <Field label="Овог" value={lastName} onChange={setLastName} />

        <label className="block">
          <div className="mb-1.5 text-sm font-bold text-ink-900">Хүйс</div>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
          >
            <option value="">Сонгоогүй</option>
            <option value="female">Эмэгтэй</option>
            <option value="male">Эрэгтэй</option>
          </select>
        </label>

        <Field
          label="Имэйл хаяг"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@example.com"
        />

        {/* Төрсөн огноо — урамшууллын үндэс */}
        <label className="block">
          <div className="mb-1.5 text-sm font-bold text-ink-900">
            Төрсөн он / сар / өдөр
          </div>
          <input
            type="date"
            value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            disabled={birthLocked}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 disabled:bg-ink-100 disabled:text-ink-500"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            {birthLocked
              ? "🎁 Төрсөн өдрийн урамшуулалд бүртгэгдсэн. Өөрчлөх бол 7575-2525 дугаарт хандана уу."
              : "🎁 Төрсөн өдрөөр тань урамшуулал ирнэ. Нэг удаа бөглөнө."}
          </p>
        </label>

        <div>
          <PhoneField label="Утасны дугаар" value={phone} onChange={setPhone} />
          <p className="mt-1.5 text-xs text-ink-500">
            Хүргэлтийн үед энэ дугаараар холбогдоно.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          ⚠️ {error}
        </div>
      )}
      {saved && !pending && (
        <div className="mt-5 rounded-xl border border-lime-300 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-700">
          ✓ Мэдээлэл хадгалагдлаа
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-[12px] bg-brand-600 px-7 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:bg-ink-300"
        >
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, required, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-ink-900">
        {label} {required && <span className="text-brand-600">*</span>}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
      />
    </label>
  );
}

function PhoneField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-bold text-ink-900">{label}</div>
      <div className="flex items-center rounded-[10px] border-[1.5px] border-ink-200 bg-white transition focus-within:border-brand-500">
        <span className="pl-3 pr-1 text-sm font-semibold text-ink-500">+976</span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={8}
          value={value}
          placeholder="9999 9999"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="w-full rounded-r-[10px] bg-transparent px-2 py-2.5 text-sm outline-none"
        />
      </div>
    </label>
  );
}
