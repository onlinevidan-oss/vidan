# VIDAN Shop

Дөрвөн Өлзий ХХК-ийн VIDAN брэндийн онлайн худалдааны платформ.

## 🛠 Технологи

- **Next.js 16** (App Router) + React 19
- **Tailwind CSS 4** (CSS-first `@theme`)
- **Supabase** (Postgres + Auth + Storage + Realtime)
- **TypeScript**, **Zustand**, **React Hook Form**, **Zod**
- **pnpm** package manager

## 🚀 Эхлүүлэх

```bash
pnpm install
cp .env.example .env.local
# .env.local-д Supabase credentials оруулах

pnpm dev --port 3100
```

Дараа нь http://localhost:3100 руу нэвтэрнэ.

## 📁 Бүтэц

```
src/
├── app/
│   ├── (customer)/        # public store route group
│   │   ├── layout.tsx
│   │   └── page.tsx        # home
│   ├── globals.css         # Tailwind 4 @theme + base
│   └── layout.tsx          # root
├── components/
│   ├── ui/                 # Logo, button primitives
│   ├── customer/           # Header, Footer, ProductCard
│   └── admin/              # (Phase 2-д)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # browser client
│   │   ├── server.ts       # server client
│   │   └── middleware.ts   # session refresh helper
│   ├── utils.ts            # cn, formatMnt, formatPhone
│   └── sample-data.ts      # түр sample data
└── proxy.ts                # Next.js 16 proxy (admin protection)
```

## 🎨 VIDAN брэндийн өнгө

`globals.css` дотор `@theme` directive ашиглан Tailwind 4-д шууд тохируулсан:

- **brand-{50,100,200,500,600,700,900}** — улаан өнгөний шат
- **lime-{50,100,300,500,600,700}** — лайм навч
- **cream, cream-100** — дулаан дэвсгэр
- **ink-{100,200,300,500,700,800,900}** — текст ба сүүдэр

Жишээ: `bg-brand-600 text-white hover:bg-brand-700`

## 📚 Phase progress

- [x] **Phase 0** — Setup (Next.js 16, Tailwind 4, Supabase packages, pnpm)
- [x] **Phase 1** — Customer home page (React component-аар хувирсан)
- [ ] **Phase 2** — Supabase project + DB schema
- [ ] **Phase 3** — Phone OTP auth (Mobicom SMS)
- [ ] **Phase 4** — Admin auth + RBAC
- [ ] **Phase 5** — Каталог + product detail
- [ ] **Phase 6** — Сагс + checkout
- [x] **Phase 7** — QPay интеграц (онлайн төлбөр, QR, callback, e-barimt)
- [ ] **Phase 8** — Order management
- [ ] **Phase 9** — Reports
- [ ] **Phase 10** — Promotions
- [ ] **Phase 11** — Notifications
- [ ] **Phase 12** — Production deploy

## 💳 QPay онлайн төлбөр

QPay v2 merchant API-аар QR төлбөр хүлээн авна (ДӨРВӨН-ӨЛЗИЙ ХХК — VIDAN).

### Тохиргоо (`.env.local`)

```bash
QPAY_USERNAME=VIDAN_MN
QPAY_PASSWORD=••••••••
QPAY_INVOICE_CODE=VIDAN_MN
QPAY_BASE_URL=https://merchant.qpay.mn/v2
QPAY_CALLBACK_BASE_URL=https://your-domain.mn   # callback-ийн public домэйн
SUPABASE_SERVICE_ROLE_KEY=••••                  # callback/token cache бичихэд
```

### Урсгал

1. **Checkout** — хэрэглэгч `QPay` сонгоход `place_order` RPC захиалга үүсгэнэ
   (`payment_status = pending`).
2. **Payment page** (`/checkout/payment/[orderId]`) — qPay нэхэмжлэл (invoice)
   үүсгэж QR код + банкны апп-уудын deeplink харуулна. 3 секунд тутам автоматаар
   төлбөр шалгана.
3. **Callback** (`/api/qpay/callback?order_id=…`) — qPay төлбөр төлөгдсөний дараа
   дуудна. Шууд итгэлгүйгээр `/payment/check`-ээр **баталгаажуулж** байж
   `payment_status = paid` болгоно.
4. **E-barimt** — төлбөр баталгаажсаны дараа best-effort үүсгэнэ.

### Гол онцлог

- **Token cache** — access token-ийг `qpay_tokens` хүснэгтэд хадгалж, хүчинтэй
  хугацаанд **нэг л удаа** авна (серверлесс орчинд найдвартай).
- **Idempotent** — `mark_order_paid` RPC давхар callback/polling-д давхар бичихгүй.
- **Аюулгүй** — үнэ DB-ээс уншина, callback-ийг `payment/check`-ээр шалгана,
  бичих үйлдэл зөвхөн `service_role`-оор.

### Холбогдох файлууд

- `src/lib/qpay/client.ts` — QPay API client (token, invoice, check, ebarimt)
- `src/lib/qpay/orders.ts` — order ↔ invoice холбогч логик
- `src/app/api/qpay/callback/route.ts` — callback endpoint
- `supabase/migrations/0009_qpay.sql` — qpay_tokens, qpay_invoices, mark_order_paid

## ⚠️ Next.js 16 онцлогууд

- `middleware.ts` → `proxy.ts` (deprecated)
- `params` ба `searchParams` нь `Promise<>` болсон — `await` хэрэгтэй
- `PageProps<'/route'>` ба `LayoutProps<'/route'>` глобал helper байгаа
- Tailwind 4 нь `@theme` directive ашигладаг (config файл байхгүй)
