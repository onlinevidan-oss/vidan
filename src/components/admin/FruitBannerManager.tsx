"use client";

/**
 * "Жимс" хуудасны баннер (жимсний админы тохиргоо). Олон зураг нэмж
 * болно — сайт дээр ээлжлэн солигдоно. Зургийг браузерт ≤1600px өргөн
 * JPEG болгоод сервер рүү илгээнэ.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFruitBanner, moveFruitBanner, removeFruitBanner } from "@/app/admin/fruit/actions";

const MAX_W = 1600;

async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85),
  );
}

export function FruitBannerManager({
  urls,
  defaultUrl,
  max,
}: {
  /** Тохиргоонд хадгалсан зургууд (хоосон бол сайт дээр анхдагч зураг гарна) */
  urls: string[];
  defaultUrl: string;
  max: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, ok: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error);
      setNotice(ok);
      router.refresh();
    });
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    if (urls.length + files.length > max) {
      return setError(`Хамгийн ихдээ ${max} зураг — одоо ${max - urls.length} зураг нэмэх боломжтой`);
    }
    run(async () => {
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) return { ok: false, error: "Зураг 15MB-аас бага байх ёстой" };
        let blob: Blob;
        try {
          blob = await toJpeg(file);
        } catch {
          return { ok: false, error: `"${file.name}"-ийг уншиж чадсангүй — өөр файл оруулна уу` };
        }
        const form = new FormData();
        form.append("file", new File([blob], "banner.jpg", { type: "image/jpeg" }));
        const r = await addFruitBanner(form);
        if (!r.ok) return r;
      }
      return { ok: true };
    }, files.length > 1 ? `✓ ${files.length} зураг нэмэгдлээ` : "✓ Зураг нэмэгдлээ");
  }

  const shown = urls.length ? urls : [defaultUrl];

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="font-bold text-ink-900">«Жимс» хуудасны баннер</div>
      <p className="mt-1 text-xs text-ink-500">
        Хуудасны дээд талын том зураг. Олон зураг нэмбэл 5 секунд тутам ээлжлэн солигдоно.
        Хэвтээ (өргөн) зураг тохиромжтой — зүүн талд нь бичиг давхарлаж гардаг.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map((url, i) => (
          <div key={url} className="overflow-hidden rounded-xl border border-ink-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Баннер ${i + 1}`} className="aspect-[16/6] w-full object-cover" />
            <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs">
              <span className="font-bold text-ink-700">{urls.length ? `${i + 1}-р зураг` : "Анхдагч зураг"}</span>
              {urls.length > 0 && (
                <span className="ml-auto flex gap-1">
                  <IconBtn label="Урагш" disabled={pending || i === 0} onClick={() => run(() => moveFruitBanner(url, -1), "✓ Дараалал солигдлоо")}>←</IconBtn>
                  <IconBtn label="Хойш" disabled={pending || i === urls.length - 1} onClick={() => run(() => moveFruitBanner(url, 1), "✓ Дараалал солигдлоо")}>→</IconBtn>
                  <IconBtn
                    label="Хасах"
                    danger
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`${i + 1}-р зургийг баннераас хасах уу?`)) run(() => removeFruitBanner(url), "✓ Зураг хасагдлаа");
                    }}
                  >
                    ✕
                  </IconBtn>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {urls.length < max && (
          <label
            className={`cursor-pointer rounded-[10px] bg-ink-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-ink-700 ${pending ? "pointer-events-none opacity-50" : ""}`}
          >
            {pending ? "Хадгалж байна…" : "＋ Зураг нэмэх"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={pending} />
          </label>
        )}
        <span className="text-xs text-ink-500">
          {urls.length}/{max} зураг
        </span>
        {notice && <span className="text-sm font-bold text-lime-700">{notice}</span>}
        {error && <span className="text-sm font-semibold text-brand-600">{error}</span>}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-7 w-7 place-items-center rounded-lg border border-ink-200 font-bold transition disabled:opacity-30 ${danger ? "text-brand-600 hover:border-brand-600" : "text-ink-700 hover:border-ink-400"}`}
    >
      {children}
    </button>
  );
}
