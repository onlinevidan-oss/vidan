"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { formatMnt, formatPhone } from "@/lib/utils";
import { placeOrder } from "@/app/(customer)/checkout/actions";
import {
  calculateOrderTotals,
  COMMERCE_DEFAULTS,
  type CommerceSettings,
} from "@/lib/pricing";
import { ADDRESS_LABELS, UB_DISTRICTS, khoroosOf } from "@/lib/ub-address";
import type { Database } from "@/lib/supabase/database.types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

type PaymentMethod = "qpay";

// Одоогоор зөвхөн QPay (QR) төлбөр идэвхтэй.
const PAY_OPTIONS: { value: PaymentMethod; emoji: string; label: string; desc: string }[] = [
  { value: "qpay", emoji: "📱", label: "QPay", desc: "QR-аар банкны апп-аар төл" },
];

export function CheckoutView({
  profile,
  addresses,
  settings = COMMERCE_DEFAULTS,
}: {
  user: { id: string; email: string | null };
  profile: { full_name: string | null; phone: string | null } | null;
  addresses: Address[];
  settings?: CommerceSettings;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.totalAmount());
  const clearCart = useCart((s) => s.clear);

  const [addressId, setAddressId] = useState<string | "new">(
    addresses[0]?.id ?? "new",
  );
  const [newAddr, setNewAddr] = useState({
    label: "Гэр",
    district: "",
    khoroo: "",
    detail: "",
  });
  const [customLabel, setCustomLabel] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("qpay");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="my-12 grid place-items-center">
        <div className="rounded-2xl border-[1.5px] border-dashed border-ink-200 bg-white p-10 text-center">
          <div className="mb-3 text-5xl">🛒</div>
          <h2 className="font-display mb-2 text-xl font-extrabold">Сагс хоосон байна</h2>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-[10px] bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Бараа үзэх
          </Link>
        </div>
      </div>
    );
  }

  const { shipping, tax, total } = calculateOrderTotals(subtotal, settings);
  const belowMinOrder = subtotal < settings.min_order_amount;

  function handleSubmit() {
    setError(null);
    if (belowMinOrder) {
      setError(
        `Захиалгын доод дүн ${formatMnt(settings.min_order_amount)} — сагсандаа бараа нэмнэ үү`,
      );
      return;
    }
    if (addressId === "new") {
      if (!newAddr.district) {
        setError("Дүүргээ сонгоно уу");
        return;
      }
      if (!newAddr.khoroo) {
        setError("Хороогоо сонгоно уу");
        return;
      }
      if (!newAddr.detail.trim()) {
        setError("Дэлгэрэнгүй хаягаа бичнэ үү (гудамж, байр, орц, тоот)");
        return;
      }
    }
    startTransition(async () => {
      const result = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        addressId: addressId === "new" ? undefined : addressId,
        newAddress:
          addressId === "new"
            ? { ...newAddr, district: `${newAddr.district} дүүрэг` }
            : undefined,
        paymentMethod: payment,
        driverNotes: notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearCart();
      // QPay бол QR төлбөрийн хуудас руу, бусад нь шууд баталгаажуулалт руу
      if (payment === "qpay") {
        router.push(`/checkout/payment/${result.orderId}`);
      } else {
        router.push(`/checkout/success/${result.orderId}`);
      }
    });
  }

  return (
    <div className="my-6">
      <nav className="mb-2 flex items-center gap-2 text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">Нүүр</Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-brand-700">Сагс</Link>
        <span>/</span>
        <span className="text-ink-700">Захиалга өгөх</span>
      </nav>
      <h1 className="mb-6 font-display text-3xl md:text-[34px] font-black tracking-tight text-ink-900">
        Захиалга өгөх
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left */}
        <div className="space-y-5">
          {/* Customer info */}
          <Section title="1. Хэрэглэгч">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Нэр" value={profile?.full_name || "—"} />
              <Info label="Утас" value={profile?.phone ? formatPhone(profile.phone) : "—"} />
            </div>
          </Section>

          {/* Address */}
          <Section title="2. Хүргэх хаяг">
            <div className="space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={
                    addressId === a.id
                      ? "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-brand-600 bg-brand-50 p-3.5"
                      : "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-ink-200 bg-white p-3.5 hover:border-brand-200"
                  }
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={addressId === a.id}
                    onChange={() => setAddressId(a.id)}
                    className="mt-1 accent-brand-600"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-ink-900">
                      {a.label}{" "}
                      {a.is_default && (
                        <span className="ml-1 rounded bg-lime-500 px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900">
                          ҮНДСЭН
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-700">
                      {[a.district, a.khoroo, a.detail].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </label>
              ))}
              <label
                className={
                  addressId === "new"
                    ? "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-brand-600 bg-brand-50 p-3.5"
                    : "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-dashed border-ink-200 bg-white p-3.5 hover:border-brand-200"
                }
              >
                <input
                  type="radio"
                  name="addr"
                  checked={addressId === "new"}
                  onChange={() => setAddressId("new")}
                  className="mt-1 accent-brand-600"
                />
                <div className="flex-1">
                  <div className="font-bold text-ink-900">＋ Шинэ хаяг нэмэх</div>
                </div>
              </label>

              {addressId === "new" && (
                <div className="space-y-3 rounded-xl border border-ink-200 bg-cream p-4">
                  {/* Тэмдэглэгээ — Гэр / Ажил / Өөр */}
                  <div>
                    <div className="mb-1.5 text-[13px] font-bold text-ink-700">
                      Тэмдэглэгээ
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ADDRESS_LABELS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => {
                            setCustomLabel(false);
                            setNewAddr({ ...newAddr, label: l });
                          }}
                          className={
                            !customLabel && newAddr.label === l
                              ? "rounded-full border-[1.5px] border-brand-600 bg-brand-50 px-4 py-1.5 text-[13px] font-bold text-brand-700"
                              : "rounded-full border-[1.5px] border-ink-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-ink-700 transition hover:border-brand-200"
                          }
                        >
                          {l}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setCustomLabel(true);
                          setNewAddr({ ...newAddr, label: "" });
                        }}
                        className={
                          customLabel
                            ? "rounded-full border-[1.5px] border-brand-600 bg-brand-50 px-4 py-1.5 text-[13px] font-bold text-brand-700"
                            : "rounded-full border-[1.5px] border-ink-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-ink-700 transition hover:border-brand-200"
                        }
                      >
                        Өөр…
                      </button>
                    </div>
                    {customLabel && (
                      <input
                        type="text"
                        value={newAddr.label}
                        onChange={(e) =>
                          setNewAddr({ ...newAddr, label: e.target.value })
                        }
                        placeholder="Жнь: Эмээгийн гэр"
                        autoFocus
                        className="mt-2 w-full rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      />
                    )}
                  </div>

                  {/* Дүүрэг + Хороо — сонголт */}
                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div>
                      <div className="mb-1.5 text-[13px] font-bold text-ink-700">
                        Дүүрэг
                      </div>
                      <select
                        value={newAddr.district}
                        onChange={(e) =>
                          setNewAddr({
                            ...newAddr,
                            district: e.target.value,
                            khoroo: "",
                          })
                        }
                        className="w-full cursor-pointer rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500"
                      >
                        <option value="" disabled>
                          Дүүрэг сонгох
                        </option>
                        {UB_DISTRICTS.map((d) => (
                          <option key={d.name} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[13px] font-bold text-ink-700">
                        Хороо
                      </div>
                      <select
                        value={newAddr.khoroo}
                        onChange={(e) =>
                          setNewAddr({ ...newAddr, khoroo: e.target.value })
                        }
                        disabled={!newAddr.district}
                        className="w-full cursor-pointer rounded-[10px] border-[1.5px] border-ink-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500"
                      >
                        <option value="" disabled>
                          {newAddr.district ? "Хороо сонгох" : "Эхлээд дүүрэг сонгоно"}
                        </option>
                        {khoroosOf(newAddr.district).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Field label="Дэлгэрэнгүй (заавал)" value={newAddr.detail}
                    onChange={(v) => setNewAddr({ ...newAddr, detail: v })}
                    placeholder="Гудамж, байр, орц, тоот" required />
                </div>
              )}
            </div>
          </Section>

          {/* Payment */}
          <Section title="3. Төлбөрийн арга">
            <div className={PAY_OPTIONS.length > 1 ? "grid grid-cols-3 gap-2.5" : "grid grid-cols-1 gap-2.5"}>
              {PAY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPayment(p.value)}
                  className={
                    payment === p.value
                      ? "rounded-xl border-[1.5px] border-brand-600 bg-brand-50 p-3.5 text-center"
                      : "rounded-xl border-[1.5px] border-ink-200 bg-white p-3.5 text-center transition hover:border-brand-200"
                  }
                >
                  <div className="mb-1.5 text-2xl">{p.emoji}</div>
                  <div className="text-sm font-bold text-ink-900">{p.label}</div>
                  <div className="mt-0.5 text-[11px] text-ink-500">{p.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Notes */}
          <Section title="4. Жолоочид заавар (заавал биш)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Жнь: Орцны код 1234, 2-р давхар"
              className="min-h-[80px] w-full resize-y rounded-xl border-[1.5px] border-ink-200 bg-white p-3 text-sm outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
            />
          </Section>
        </div>

        {/* Summary */}
        <aside>
          <div className="sticky top-24 rounded-2xl border border-ink-200 bg-white p-5">
            <h3 className="font-display mb-4 text-base font-extrabold text-ink-900">
              Захиалгын хураангуй
            </h3>
            <div className="mb-4 max-h-[200px] space-y-2 overflow-y-auto">
              {items.map((i) => (
                <div key={i.productId} className="flex justify-between gap-2 text-xs">
                  <span className="truncate text-ink-700">
                    {i.name} × {i.quantity}
                  </span>
                  <span className="shrink-0 font-bold text-ink-900">
                    {formatMnt(i.price * i.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="my-3 h-px bg-ink-100" />
            <Row label="Дэд дүн" value={formatMnt(subtotal)} />
            <Row label="Хүргэлт" value={shipping === 0 ? "Үнэгүй" : formatMnt(shipping)}
              accent={shipping === 0 ? "success" : undefined} />
            <Row label="НӨАТ (10%)" value={formatMnt(tax)} />
            <div className="my-3 h-px bg-ink-100" />
            <div className="mb-5 flex items-baseline justify-between">
              <div className="text-sm font-bold text-ink-900">Нийт</div>
              <div className="font-display text-2xl font-black text-brand-700">
                {formatMnt(total)}
              </div>
            </div>

            {error && (
              <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs font-semibold text-brand-700">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={pending || belowMinOrder}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-600 py-4 text-base font-extrabold text-white shadow-[0_6px_16px_rgba(215,35,39,0.3)] transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:shadow-none"
            >
              {pending ? "Захиалга үүсгэж байна…" : `✓ Захиалга баталгаажуулах (${formatMnt(total)})`}
            </button>
            <Link
              href="/cart"
              className="mt-2 block text-center text-xs font-bold text-ink-500 hover:text-brand-700 hover:underline"
            >
              ← Сагс руу буцах
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <h3 className="font-display mb-3.5 text-sm font-extrabold uppercase tracking-wider text-ink-700">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-ink-900">{value}</div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label} {required && <span className="text-brand-600">*</span>}
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-[1.5px] border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500"
      />
    </label>
  );
}

function Row({
  label, value, accent,
}: {
  label: string;
  value: string;
  accent?: "success";
}) {
  return (
    <div className="mb-2 flex justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span
        className={
          accent === "success"
            ? "font-semibold text-[#2da764]"
            : "font-semibold text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
