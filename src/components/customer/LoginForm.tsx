"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp" | "success";

export function LoginForm() {
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

  async function verifyOtp() {
    if (otp.length !== 6) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
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
      router.push("/");
      router.refresh();
    }, 1200);
  }

  async function resendOtp() {
    if (countdown > 0) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
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
  onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  isValid: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  function format(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
  }

  return (
    <>
      <h2 className="font-display mb-2 text-[28px] font-black leading-tight tracking-tight">
        Нэвтрэх
      </h2>
      <p className="mb-7 text-sm leading-relaxed text-ink-700">
        Утасны дугаараа оруулна уу. Бид{" "}
        <strong className="font-bold text-brand-700">SMS</strong>-р
        баталгаажуулах код илгээх болно.
      </p>

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

      <div className="mt-6 rounded-lg bg-lime-50 p-3 text-[11px] text-ink-700">
        <strong className="text-lime-700">💡 Тест:</strong> 9911 2233 (код:{" "}
        <strong>123456</strong>) · 9988 7766 (код: <strong>111111</strong>)
      </div>
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

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const arr = otp.split("");
    arr[i] = digit;
    const next = arr.join("").padEnd(6, "").slice(0, 6).trimEnd();
    setOtp(next);
    if (digit && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
      const arr = otp.split("");
      arr[i - 1] = "";
      setOtp(arr.join(""));
    }
    if (e.key === "Enter" && otp.length === 6) onVerify();
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
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={otp[i] ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`font-display h-[64px] w-[52px] rounded-[12px] border-[1.5px] text-center text-2xl font-extrabold outline-none transition focus:border-brand-500 focus:-translate-y-0.5 focus:shadow-[0_0_0_4px_var(--color-brand-100)] ${
              otp[i]
                ? "border-lime-500 bg-lime-50"
                : "border-ink-200 bg-white"
            }`}
          />
        ))}
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
        disabled={otp.length !== 6 || loading}
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
