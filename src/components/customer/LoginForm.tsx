"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp" | "success";

export function LoginForm({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Countdown timer
  useEffect(() => {
    if (step !== "otp") return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown]);

  // Mongolian phone validator (8 digits starting 6-9)
  const phoneDigits = phone.replace(/\D/g, "");
  const isPhoneValid = /^[6-9]\d{7}$/.test(phoneDigits);
  const fullPhone = `+976${phoneDigits}`;

  async function sendOtp() {
    if (!isPhoneValid) {
      setError("Дугаар буруу байна. 8 оронтой утасны дугаар оруулна уу.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("otp");
    setCountdown(60);
    setOtp("");
  }

  // OTP digit count (spaces = empty)
  const otpDigitsOnly = otp.replace(/\s/g, "");
  const otpComplete = otpDigitsOnly.length === 6;

  async function verifyOtp() {
    if (!otpComplete) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otpDigitsOnly,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      setError("Код буруу байна. Дахин оролдоно уу.");
      setOtp("");
      return;
    }
    setStep("success");
    setTimeout(() => {
      router.push(next);
      router.refresh();
    }, 1200);
  }

  // Debounce: pending resend үед дахин дарж олон SMS илгээхээс сэргийлэх
  async function resendOtp() {
    if (countdown > 0 || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCountdown(60);
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-ink-200 bg-white p-10 shadow-[var(--shadow-brand-md)]">
      {step === "phone" && (
        <PhoneStep
          phone={phone}
          setPhone={setPhone}
          isValid={isPhoneValid}
          loading={loading}
          error={error}
          next={next}
          onSubmit={sendOtp}
        />
      )}

      {step === "otp" && (
        <OtpStep
          fullPhone={fullPhone}
          otp={otp}
          setOtp={setOtp}
          loading={loading}
          error={error}
          countdown={countdown}
          onVerify={verifyOtp}
          onResend={resendOtp}
          onChangePhone={() => {
            setStep("phone");
            setError(null);
          }}
        />
      )}

      {step === "success" && <SuccessStep />}
    </div>
  );
}

/* ============================================================
   STEP 1: PHONE
   ============================================================ */
function PhoneStep({
  phone,
  setPhone,
  isValid,
  loading,
  error,
  next,
  onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  isValid: boolean;
  loading: boolean;
  error: string | null;
  next: string;
  onSubmit: () => void;
}) {
  function format(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
  }

  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <>
      <h2 className="font-display mb-2 text-[28px] font-black leading-tight tracking-tight">
        Нэвтрэх
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-ink-700">
        Утасны дугаараа эсвэл Google бүртгэлээ ашиглан нэвтэрнэ үү.
      </p>

      {/* Google sign-in */}
      <button
        onClick={signInWithGoogle}
        className="mb-5 flex w-full items-center justify-center gap-3 rounded-[12px] border-[1.5px] border-ink-200 bg-white px-4 py-3.5 text-[14px] font-bold text-ink-900 transition hover:-translate-y-0.5 hover:border-ink-300 hover:bg-cream"
      >
        <GoogleIcon />
        Google-аар үргэлжлүүлэх
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-ink-500">
        <span className="h-px flex-1 bg-ink-200" />
        эсвэл
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <div className="mb-5">
        <label className="mb-2 block text-[13px] font-bold text-ink-700">
          Гар утасны дугаар
        </label>
        <div className="flex items-stretch overflow-hidden rounded-[12px] border-[1.5px] border-ink-200 bg-white transition focus-within:border-brand-500 focus-within:shadow-[0_0_0_4px_var(--color-brand-100)]">
          <div className="flex items-center gap-2 border-r-[1.5px] border-ink-200 bg-ink-100 px-3.5 text-[15px] font-bold">
            🇲🇳 +976
          </div>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9999 9999"
            value={phone}
            onChange={(e) => setPhone(format(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isValid) onSubmit();
            }}
            className="font-display flex-1 bg-transparent px-4 py-3.5 text-[17px] font-bold tracking-wider outline-none placeholder:text-ink-300 placeholder:font-medium placeholder:tracking-normal"
          />
        </div>
        <div className="mt-2 text-xs text-ink-500">
          8 оронтой Монголын дугаар (88, 99 эсвэл 95 -р эхэлсэн)
        </div>
        {error && (
          <div className="mt-2 text-xs font-semibold text-brand-600">{error}</div>
        )}
      </div>

      <button
        onClick={onSubmit}
        disabled={!isValid || loading}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-600 px-4 py-4 text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:shadow-none"
      >
        {loading ? "Илгээж байна…" : "Код илгээх →"}
      </button>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-500">
        Нэвтэрснээр та манай{" "}
        <a href="#" className="font-bold text-brand-700">
          Үйлчилгээний нөхцөл
        </a>{" "}
        болон{" "}
        <a href="#" className="font-bold text-brand-700">
          Нууцлалын бодлогыг
        </a>{" "}
        зөвшөөрч байна.
      </p>

    </>
  );
}

/* ============================================================
   STEP 2: OTP
   ============================================================ */
function OtpStep({
  fullPhone,
  otp,
  setOtp,
  loading,
  error,
  countdown,
  onVerify,
  onResend,
  onChangePhone,
}: {
  fullPhone: string;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  error: string | null;
  countdown: number;
  onVerify: () => void;
  onResend: () => void;
  onChangePhone: () => void;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // OTP-ийг 6 урттай fixed string-ээр хадгална (" " = empty slot).
  // Ингэснээр оронгуйд оруулсан digit нь position-аа алдахгүй.
  const padOtp = (s: string) => s.padEnd(6, " ").slice(0, 6);

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const arr = padOtp(otp).split("");
    arr[i] = digit || " ";
    setOtp(arr.join(""));
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const padded = padOtp(otp);
    if (e.key === "Backspace") {
      const arr = padded.split("");
      if (padded[i] === " " && i > 0) {
        arr[i - 1] = " ";
        setOtp(arr.join(""));
        inputsRef.current[i - 1]?.focus();
      } else {
        arr[i] = " ";
        setOtp(arr.join(""));
      }
      e.preventDefault();
    }
    if (e.key === "Enter" && padded.replace(/\s/g, "").length === 6) {
      onVerify();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtp(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  }

  const displayPhone = fullPhone.replace(
    /^\+976(\d{4})(\d{4})$/,
    "+976 $1 $2",
  );

  return (
    <>
      <h2 className="font-display mb-2 text-[28px] font-black leading-tight tracking-tight">
        Код оруулна уу
      </h2>
      <p className="mb-7 text-sm leading-relaxed text-ink-700">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-2.5 py-1 font-bold text-brand-700">
          📱 {displayPhone}
          <button
            onClick={onChangePhone}
            className="ml-1 text-[11px] underline"
          >
            солих
          </button>
        </span>{" "}
        дугаарт илгээсэн 6 оронтой кодыг оруулна уу.
      </p>

      <div className="mb-5 flex justify-center gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const ch = padOtp(otp)[i];
          const filled = ch && ch !== " ";
          return (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={filled ? ch : ""}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={`font-display h-[64px] w-[52px] rounded-[12px] border-[1.5px] text-center text-2xl font-extrabold outline-none transition focus:border-brand-500 focus:-translate-y-0.5 focus:shadow-[0_0_0_4px_var(--color-brand-100)] ${
                filled
                  ? "border-lime-500 bg-lime-50"
                  : "border-ink-200 bg-white"
              }`}
            />
          );
        })}
      </div>

      {error && (
        <div className="mb-4 text-center text-xs font-semibold text-brand-600">
          {error}
        </div>
      )}

      <div className="mb-6 text-center text-[13px] text-ink-500">
        Код ирээгүй юу?{" "}
        <button
          onClick={onResend}
          disabled={countdown > 0 || loading}
          className="font-bold text-brand-700 underline disabled:text-ink-500 disabled:no-underline"
        >
          {countdown > 0 ? `Дахин илгээх (${countdown}с)` : "Дахин илгээх"}
        </button>
      </div>

      <button
        onClick={onVerify}
        disabled={padOtp(otp).replace(/\s/g, "").length !== 6 || loading}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-600 px-4 py-4 text-[15px] font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:shadow-none"
      >
        {loading ? "Шалгаж байна…" : "Баталгаажуулах →"}
      </button>
    </>
  );
}

/* ============================================================
   STEP 3: SUCCESS
   ============================================================ */
function SuccessStep() {
  return (
    <div className="py-6 text-center">
      <div className="animate-[pop_.4s_ease] mx-auto mb-6 grid h-22 w-22 place-items-center rounded-full border-[3px] border-lime-500 bg-lime-100 text-5xl text-lime-700">
        ✓
      </div>
      <h2 className="font-display mb-3 text-[28px] font-black tracking-tight">
        Амжилттай нэвтэрлээ!
      </h2>
      <p className="mb-7 text-ink-700">
        Сайн байна уу 👋 VIDAN гэр бүлд тавтай морил.
      </p>
      <div className="text-xs text-ink-500">Нүүр хуудас руу шилжиж байна…</div>
    </div>
  );
}

/* ============================================================
   Google official "G" logo (SVG)
   ============================================================ */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
