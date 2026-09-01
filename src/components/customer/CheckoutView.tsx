"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";
import { formatMnt } from "@/lib/utils";
import { checkPromoCode, placeOrder } from "@/app/(customer)/checkout/actions";
import {
  calculateOrderTotals,
  COMMERCE_DEFAULTS,
  type CommerceSettings,
} from "@/lib/pricing";
import { ADDRESS_LABELS, UB_DISTRICTS, khoroosOf } from "@/lib/ub-address";
import type { Database } from "@/lib/supabase/database.types";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

/** Монголын гар утасны дугаар — 8 орон, 6–9-өөр эхэлнэ */
function isValidMnPhone(raw: string): boolean {
  return /^[6-9]\d{7}$/.test(raw.replace(/\D/g, ""));
}

/**
 * Профайлд утас янз бүрийн хэлбэрээр хадгалагдсан байдаг
 * ("97694070800", "+976 9407 0800", "94070800"). Талбарт 8 оронтой
 * дотоодын дугаар болгож оруулна — олдохгүй бол хоосон.
 */
function toLocalPhone(raw: string | null | undefined): string {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("976")) d = d.slice(3);
  return isValidMnPhone(d) ? d : "";
}

// Төлбөрийн арга энэ хуудсанд харагдахгүй — захиалга баталгаажмагц
// QPay төлбөрийн хуудас руу шилжинэ.

export function CheckoutView({
  profile,
  addresses,
  settings = COMMERCE_DEFAULTS,
  ebarimtEnabled = false,
}: {
  user: { id: string; email: string | null };
  profile: { full_name: string | null; phone: string | null } | null;
  addresses: Address[];
  settings?: CommerceSettings;
  ebarimtEnabled?: boolean;
}) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.totalAmount());
  const itemCount = useCart((s) => s.totalCount());
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
  // Хүргэлтийн холбоо барих утас — профайлд байвал урьдчилж бөглөнө.
  // Имэйл/Google-ээр нэвтэрсэн хэрэглэгчид энэ талбар хоосон ирнэ.
  const [phone, setPhone] = useState(() => toLocalPhone(profile?.phone));
  const [phone2, setPhone2] = useState("");
  // Промо код — сервер шалгаж хөнгөлөлтийг буцаана
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [notes, setNotes] = useState("");
  // Баримт — хувь хүн (B2C) / байгууллага (B2B)
  const [ebarimtType, setEbarimtType] = useState<"B2C_RECEIPT" | "B2B_RECEIPT">(
    "B2C_RECEIPT",
  );
  const [consumerNo, setConsumerNo] = useState("");
  const [customerTin, setCustomerTin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [pending, startTransition] = useTransition();

  // Захиалга баталгаажсаны дараа төлбөрийн хуудас руу шилжих хооронд
  // "Сагс хоосон" гэж анивчихын оронд ачааллын дэлгэц харуулна.
  if (redirecting) {
    return (
      <div className="my-16 grid place-items-center">
        <div className="rounded-2xl border-[1.5px] border-ink-200 bg-white p-12 text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600" />
          <h2 className="font-display mb-1 text-lg font-extrabold text-ink-900">
            Захиалга баталгаажлаа
          </h2>
          <p className="text-sm text-ink-500">
            Төлбөрийн хуудас руу шилжиж байна…
          </p>
        </div>
      </div>
    );
  }

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

  const discount = promo?.discount ?? 0;
  const { shipping, tax, total } = calculateOrderTotals(
    subtotal,
    settings,
    itemCount,
    discount,
  );
  const belowMinOrder = subtotal < settings.min_order_amount;

  async function applyPromo() {
    setPromoError(null);
    setPromoChecking(true);
    const res = await checkPromoCode(
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      promoInput,
    );
    setPromoChecking(false);
    if (res.ok) {
      setPromo({ code: res.code, discount: res.discount });
      setPromoInput(res.code);
    } else {
      setPromo(null);
      setPromoError(res.error);
    }
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoError(null);
  }

  function handleSubmit() {
    setError(null);
    if (belowMinOrder) {
      setError(
        `Захиалгын барааны доод дүн ${formatMnt(settings.min_order_amount)} (хүргэлт, НӨАТ ороогүй) — сагсандаа бараа нэмнэ үү`,
      );
      return;
    }
    if (!isValidMnPhone(phone)) {
      setError("Холбоо барих утасны дугаараа оруулна уу (8 орон)");
      return;
    }
    if (phone2.trim() && !isValidMnPhone(phone2)) {
      setError("Нэмэлт утасны дугаар буруу байна (8 орон)");
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
    if (ebarimtType === "B2B_RECEIPT" && customerTin.trim().length < 7) {
      setError("Байгууллагын баримтад ТТД/регистрийн дугаар (7 орон) шаардлагатай");
      return;
    }
    startTransition(async () => {
      const result = await placeOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        addressId: addressId === "new" ? undefined : addressId,
        newAddress:
          addressId === "new"
            ? { ...newAddr, district: `${newAddr.district} дүүрэг` }
            : undefined,
        paymentMethod: "qpay",
        contactPhone: phone,
        contactPhone2: phone2,
        promoCode: promo?.code,
        driverNotes: notes,
        ebarimtType,
        ebarimtConsumerNo: consumerNo,
        ebarimtCustomerTin: customerTin,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Эхлээд ачааллын дэлгэц рүү шилжүүлж, дараа нь сагс хоослоно —
      // ингэснээр "Сагс хоосон" төлөв огт харагдахгүй.
      setRedirecting(true);
      clearCart();
      router.push(`/checkout/payment/${result.orderId}`);
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
            <Info label="Нэр" value={profile?.full_name || "—"} />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PhoneField
                label="Холбоо барих утас"
                required
                value={phone}
                onChange={setPhone}
              />
              <PhoneField
                label="Нэмэлт утас"
                value={phone2}
                onChange={setPhone2}
                hint="Заавал биш"
              />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              Хүргэлтийн жолооч энэ дугаараар холбогдоно.
            </p>
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
                        Бусад
                      </button>
                    </div>
                    {customLabel && (
                      <input
                        type="text"
                        value={newAddr.label}
                        onChange={(e) =>
                          setNewAddr({ ...newAddr, label: e.target.value })
                        }
                        placeholder=""
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

          {/* Notes — хаягийн шууд доор */}
          {/* ============ ПРОМО КОД ============ */}
          <Section title="3. Промо код">
            {promo ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-lime-300 bg-lime-50 px-4 py-3.5">
                <div>
                  <div className="font-display text-base font-extrabold text-lime-700">
                    🎟 {promo.code}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-ink-900">
                    {formatMnt(promo.discount)} хөнгөлөлт хэрэгжлээ
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePromo}
                  className="rounded-lg border-[1.5px] border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
                >
                  Хасах
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2.5 text-sm text-ink-700">
                  Промо код байвал энд оруулаад{" "}
                  <strong className="text-ink-900">Ашиглах</strong> дарна уу.
                </p>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void applyPromo();
                      }
                    }}
                    placeholder="ЖИШЭЭ: NEW10"
                    autoComplete="off"
                    aria-label="Промо код"
                    className="min-w-0 flex-1 rounded-xl border-[1.5px] border-ink-200 bg-cream px-4 py-3 text-base font-bold uppercase tracking-wider outline-none transition focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
                  />
                  <button
                    type="button"
                    onClick={() => void applyPromo()}
                    disabled={promoChecking || !promoInput.trim()}
                    className="shrink-0 rounded-xl bg-ink-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:bg-ink-300"
                  >
                    {promoChecking ? "Шалгаж байна…" : "Ашиглах"}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-sm font-semibold text-brand-700">
                    ⚠️ {promoError}
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section title="4. Жолоочид заавар (заавал биш)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Жнь: Орцны код 1234, 2-р давхар"
              className="min-h-[80px] w-full resize-y rounded-xl border-[1.5px] border-ink-200 bg-white p-3 text-sm outline-none transition focus:border-brand-500 focus:shadow-[0_0_0_3px_var(--color-brand-100)]"
            />
          </Section>

          {/* Баримт — хувь хүн / байгууллага (e-barimt холбогдсон үед л) */}
          {ebarimtEnabled && (
          <Section title="5. Төлбөрийн баримт">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEbarimtType("B2C_RECEIPT")}
                className={
                  ebarimtType === "B2C_RECEIPT"
                    ? "rounded-xl border-[1.5px] border-brand-600 bg-brand-50 p-3.5 text-left"
                    : "rounded-xl border-[1.5px] border-ink-200 bg-white p-3.5 text-left transition hover:border-brand-200"
                }
              >
                <div className="font-bold text-ink-900">Хувь хүн</div>
                <div className="mt-0.5 text-xs text-ink-500">
                  Сугалаатай баримт
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEbarimtType("B2B_RECEIPT")}
                className={
                  ebarimtType === "B2B_RECEIPT"
                    ? "rounded-xl border-[1.5px] border-brand-600 bg-brand-50 p-3.5 text-left"
                    : "rounded-xl border-[1.5px] border-ink-200 bg-white p-3.5 text-left transition hover:border-brand-200"
                }
              >
                <div className="font-bold text-ink-900">Байгууллага</div>
                <div className="mt-0.5 text-xs text-ink-500">
                  НӨАТ суутгуулах
                </div>
              </button>
            </div>

            {ebarimtType === "B2C_RECEIPT" ? (
              <div className="mt-3">
                <Field
                  label="Иргэний ebarimt дугаар (заавал биш)"
                  value={consumerNo}
                  onChange={(v) => setConsumerNo(v.replace(/\D/g, ""))}
                  placeholder="Жнь: 10038071"
                />
                <p className="mt-1.5 text-[11px] text-ink-500">
                  Оруулбал сугалаа таны e-barimt бүртгэлд шууд орно.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <Field
                  label="Байгууллагын ТТД / регистр"
                  value={customerTin}
                  onChange={(v) => setCustomerTin(v.replace(/\D/g, ""))}
                  placeholder="Жнь: 3790084"
                  required
                />
                <p className="mt-1.5 text-[11px] text-ink-500">
                  Байгууллагын НӨАТ суутгах баримт үүснэ.
                </p>
              </div>
            )}
          </Section>
          )}
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
            <Row label="Барааны дүн" value={formatMnt(subtotal)} />
            {discount > 0 && (
              <Row
                label={`Хөнгөлөлт (${promo?.code})`}
                value={`−${formatMnt(discount)}`}
                accent="success"
              />
            )}
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
            <p className="mt-2.5 text-center text-[11px] text-ink-500">
              Баталгаажуулсны дараа QPay төлбөрийн хуудас руу шилжинэ
            </p>
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

function PhoneField({
  label, value, onChange, required, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label} {required && <span className="text-brand-600">*</span>}
        {hint && <span className="ml-1 font-medium normal-case">({hint})</span>}
      </div>
      <div className="flex items-center rounded-lg border-[1.5px] border-ink-200 bg-white transition focus-within:border-brand-500">
        <span className="pl-3 pr-1 text-sm font-semibold text-ink-500">+976</span>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={8}
          value={value}
          placeholder="9999 9999"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="w-full rounded-r-lg bg-transparent px-2 py-2 text-sm outline-none"
        />
      </div>
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
