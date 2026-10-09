# VIDAN Shop

Дөрвөн Өлзий ХХК-ийн олон брэндийн онлайн худалдааны платформ — **vidan.mn**.

Брэндүүд: **VIDAN**, **Мангас**, **Алимхан**, **Owolovo**, **Black**.

## 🛠 Технологи

- **Next.js 16.3** (App Router) + **React 19.2**
- **Tailwind CSS 4** (CSS-first `@theme`, config файлгүй)
- **Supabase** (Postgres + Auth + Storage + Realtime)
- **TypeScript**, **Zustand**, **React Hook Form**, **Zod**
- **pnpm** package manager
- Deploy: **Vercel**

## 🚀 Эхлүүлэх

```bash
pnpm install
cp .env.example .env.local
# .env.local-д Supabase болон бусад credentials оруулах

pnpm dev
```

`next dev` нь **3000** порт дээр ажиллана (`pnpm dev --port 3100` гэж солиж болно).

### Скриптүүд

| Команд | Үйлдэл |
| --- | --- |
| `pnpm dev` | Хөгжүүлэлтийн сервер |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Нэгжийн тест (Node-ийн төрөлхийн test runner) |
| `pnpm test:seo` | SEO smoke test (`scripts/seo-smoke.mjs`) |

## 🧪 Тест

Мөнгө тооцдог логикт нэгжийн тест бичсэн. Гуравдагч талын framework
**ашиглаагүй** — Node 24+ нь `node --test` болон TypeScript-ийг нэмэлт
tool-гүйгээр ажиллуулна (энэ төсөл Node 26 дээр хөгжүүлэгдэж байна).

```bash
pnpm test
```

| Файл | Юуг хамгаалж байгаа |
| --- | --- |
| `src/lib/pricing.test.ts` | Дэд дүн, хүргэлт, НӨАТ, хөнгөлөлт — DB-ийн `calc_order_totals()`-тэй нийцэх |
| `src/lib/ebarimt/build.test.ts` | Баримтын НӨАТ, хөнгөлөлт хуваарилалт, баримт ↔ захиалгын дүн таарах |
| `src/lib/ebarimt/display.test.ts` | Хэрэглэгчид харагдах баримт бодит төлсөн дүнг тусгах |
| `src/lib/utils.test.ts` | Кирилл → латин slug (404 гаргаж байсан), утас/төгрөгийн формат |
| `src/lib/product-meta.test.ts` | Картан дээрх хямдралын хувь |
| `src/lib/report-period.test.ts` | Тайлангийн хагас сарын зааг, UB цагийн шилжилт |
| `src/lib/report-aggregate.test.ts` | Санхүүгийн задаргаа, зарлага, агуулахын нэгтгэл |
| `src/lib/datetime.test.ts` | Огноо, цаг УБ цагаар харагдах (сервер UTC байсан ч) |
| `src/lib/order-list.test.ts` | Захиалгын жагсаалтын шүүлтүүр, хайлт, хуудаслалтын холбоос |
| `src/lib/order-live.test.ts` | "Яг одоо төлөгдсөн" захиалгыг худал дохиогүй таних |
| `src/lib/sku.test.ts` | SKU-гийн хэлбэр ба дараагийн дугаар |
| `src/lib/image-fit.test.ts` | Барааны зургийг жишигт оруулах тооцоо |
| `src/lib/promo.test.ts` | Промо кодын оруулгын шалгалт, төлөв |
| `src/lib/staff-rules.test.ts` | Ажилтны эрх өөрчлөх дүрэм (сүүлчийн админыг хамгаалах) |
| `src/lib/sms/recipients.test.ts` | Админы мэдэгдэл авах дугааруудыг задлах |

> Сервер (Vercel) UTC-аар ажилладаг тул цагийн бүстэй холбоотой алдаа локал
> машин дээр харагдахгүй. Шалгахдаа `TZ=UTC pnpm test` гэж ажиллуулна.

> ⚠️ Node-ийн тест ачаалдаг модуль дотор **relative import нь `.ts`
> өргөтгөлтэй** байх ёстой (ESM шаардлага) — жнь. `./build.ts`. Тиймээс
> `tsconfig.json`-д `allowImportingTsExtensions` асаалттай.

**Тест бичихдээ:** эталон нь SQL. QPay нэхэмжлэл `orders.total`-оос үүсдэг тул
клиент талын тооцоо DB-ийнхээс зөрвөл хэрэглэгч нэг дүн хараад өөр дүн төлнө.

## 📁 Бүтэц

```
src/
├── app/
│   ├── (customer)/         # нийтийн дэлгүүр (14 хуудас)
│   │   ├── page.tsx            # нүүр — hero carousel, онцлох, брэндийн тууз
│   │   ├── products/           # каталог + [slug] дэлгэрэнгүй
│   │   ├── categories/[slug]/  # ангилал
│   │   ├── brands/[slug]/      # брэнд
│   │   ├── cart/ checkout/     # сагс, төлбөр, амжилтын хуудас
│   │   ├── account/            # миний мэдээлэл + захиалгын түүх
│   │   └── about faq delivery returns privacy payment-info feedback
│   ├── admin/(protected)/  # backoffice
│   │   ├── orders/             # жагсаалт (хайлт, хуудаслалт, төлөгдөөгүй) + дэлгэрэнгүй
│   │   ├── products/ categories/
│   │   ├── inventory/          # агуулахын үлдэгдэл + хөдөлгөөн
│   │   ├── customers/          # хэрэглэгчид + захиалгын түүх
│   │   ├── promotions/         # промо код
│   │   ├── feedback/ staff/    # санал хүсэлт, ажилтны эрх
│   │   ├── reports/ traffic/ settings/
│   ├── api/
│   │   ├── qpay/callback/      # QPay төлбөрийн callback
│   │   ├── ebarimt/            # PosAPI test + mock + dev-simulate
│   │   ├── search/             # хайлтын санал болголт
│   │   └── auth/sms-hook/      # Supabase Auth "Send SMS" hook
│   └── layout.tsx          # root — metadata, JSON-LD, GA4
├── components/
│   ├── ui/ customer/ admin/ analytics/ ebarimt/
├── lib/
│   ├── pricing.ts          # ⚠️ үнийн тооцоо — DB-тэй ижил байх ёстой
│   ├── qpay/               # client, orders
│   ├── ebarimt/            # build, display, orders, posapi, qr, types
│   ├── sms/                # client, notifications
│   ├── report-period.ts    # хагас сарын хугацаа (UB цагаар)
│   ├── report-aggregate.ts # тайлангийн нэгтгэл — цэвэр функцууд
│   ├── queries/            # products, settings, reports, inventory, staff
│   ├── supabase/           # client, server, admin, public, middleware
│   ├── seo.ts analytics.ts utils.ts order-status.ts ub-address.ts
├── stores/cart.ts          # Zustand + localStorage persist
└── proxy.ts                # Next.js 16 proxy (админ хамгаалалт)
```

## 🎨 VIDAN брэндийн өнгө

`globals.css` дотор `@theme` directive ашиглан Tailwind 4-д шууд тохируулсан:

- **brand-{50,100,200,500,600,700,900}** — улаан өнгөний шат
- **lime-{50,100,300,500,600,700}** — лайм навч
- **cream, cream-100** — дулаан дэвсгэр
- **ink-{100,200,300,500,700,800,900}** — текст ба сүүдэр

Жишээ: `bg-brand-600 text-white hover:bg-brand-700`

## ✅ Хийгдсэн ажил

- [x] **Phase 0** — Setup (Next.js 16, Tailwind 4, Supabase, pnpm)
- [x] **Phase 1** — Хэрэглэгчийн нүүр хуудас
- [x] **Phase 2** — Supabase project + DB схем + RLS
- [x] **Phase 3** — Утасны OTP нэвтрэлт + Google OAuth
- [x] **Phase 4** — Админ эрх (RBAC) + backoffice
- [x] **Phase 5** — Каталог + барааны дэлгэрэнгүй
- [x] **Phase 6** — Сагс + checkout
- [x] **Phase 7** — QPay интеграц (QR, callback, e-barimt)
- [x] **Phase 8** — Захиалгын удирдлага + real-time явц
- [x] **Phase 9** — Тайлан
- [x] **Phase 10** — Промо код + хямдралын кампанит ажил
- [x] **Phase 11** — SMS мэдэгдэл (CallPro Text)
- [x] **Phase 12** — Production deploy (Vercel) + SEO/GA4

### Нэмэлтээр хийгдсэн

- Олон брэндтэй дэлгүүр (5 брэнд) + брэндийн тууз
- Хайлт — брэнд, SKU, латин нэрээр; бичиж байхад санал болгоно
- e-Barimt PosAPI 3.0 — баримт, QR, сугалаа
- Админаас удирддаг hero carousel, худалдааны тохиргоо, SMS тохиргоо
- ХҮРЭН ЗҮРХ үндэсний хөтөлбөрийн мэдэгдэл
- Санал хүсэлт, компанийн танилцуулга PDF
- Санхүүд зориулсан хэвлэгддэг тайлан ба агуулахын үлдэгдэл

## 💳 QPay онлайн төлбөр

QPay v2 merchant API-аар QR төлбөр хүлээн авна (ДӨРВӨН-ӨЛЗИЙ ХХК — VIDAN).

### Урсгал

1. **Checkout** — `place_order` RPC захиалга үүсгэнэ (`payment_status = pending`).
2. **Payment page** (`/checkout/payment/[orderId]`) — нэхэмжлэл үүсгэж QR код +
   банкны апп-уудын deeplink харуулна. 3 секунд тутам автоматаар шалгана.
3. **Callback** (`/api/qpay/callback?order_id=…`) — шууд итгэлгүйгээр
   `/payment/check`-ээр **баталгаажуулж** байж `payment_status = paid` болгоно.
4. **E-barimt** — төлбөр баталгаажсаны дараа best-effort үүснэ.

### Гол онцлог

- **Token cache** — access token-ийг `qpay_tokens` хүснэгтэд хадгалж, хүчинтэй
  хугацаанд **нэг л удаа** авна (серверлесс орчинд найдвартай).
- **Idempotent** — `mark_order_paid` RPC давхар callback/polling-д давхар бичихгүй.
- **Аюулгүй** — үнэ DB-ээс уншина, бичих үйлдэл зөвхөн `service_role`-оор.

### Холбогдох файлууд

- `src/lib/qpay/client.ts` — QPay API client (token, invoice, check, ebarimt)
- `src/lib/qpay/orders.ts` — order ↔ invoice холбогч логик
- `src/app/api/qpay/callback/route.ts` — callback endpoint
- `supabase/migrations/0009_qpay.sql` — qpay_tokens, qpay_invoices, mark_order_paid

## 🧾 E-Barimt (PosAPI 3.0)

Төлбөр баталгаажсаны дараа баримт автоматаар үүснэ (best-effort — алдаа гарвал
захиалгын урсгалыг тасалдуулахгүй).

- Үнэ **НӨАТ-гүй (net)** гэж үзэж, дээр нь 10% нэмнэ.
- Хүргэлт нь тусдаа **НӨАТ-гүй** мөр болж орно.
- Промо хөнгөлөлтийг мөр бүрд харьцаагаар хуваарилна
  (`allocateOrderDiscount` — илгээх ба харуулах хоёулаа үүнийг дуудна).
- Хөгжүүлэлтэд `/ebarimt/demo` хуудсаар баримт хэрхэн харагдахыг үзнэ
  (production-д 404).

> **Тайлбар:** нэгжийн үнэ бүхэл төгрөг байх ёстой тул `qty > 1` дээр хөнгөлөлт
> яг тэгш хуваагдахгүй байж болно. Үлдэгдлийг `residual`-аар буцааж, серверийн
> лог руу бичнэ. Тест нь зөрүүг бүхэлчлэлийн хэмжээнд байхыг баталгаажуулна.

## 🎟 Промо код ба хямдрал

**Промо код** — хөнгөлөлтийг **сервер талд** тооцно (`validate_promo` RPC).
Клиент талд бодвол кодыг өөрчилж дурын хөнгөлөлт авах боломжтой болно.
Checkout-ийн урьдчилсан харуулалт ба `place_order` **нэг л функцийг** дуудна.

**Хямдралын кампанит ажил** — `sync_sale_campaign()` нь `products.price`-ыг
бодитоор өөрчилж (`old_price` ← хуучин үнэ), хугацаа дуусмагц автоматаар
буцаана. Зөвхөн дэлгэц дээр бодохгүйн шалтгаан нь `place_order` үнийг
`products.price`-аас уншдагт байгаа.

## 📱 SMS (CallPro Text)

- Нэвтрэх OTP — Supabase Auth "Send SMS" hook (`/api/auth/sms-hook`)
- Захиалга баталгаажсан мэдэгдэл — нэг захиалганд **нэг л удаа**
- Шинэ захиалгын мэдэгдэл **админы дугаарууд руу** — төлөгдмөгц, нэг удаа
- Админ хэсгээс асаах/унтраах, текстийг засах боломжтой
- `SMS_API_KEY` хоосон бол SMS илгээхгүй (чимээгүй алгасна)

## 🔍 SEO ба аналитик

- Бүх хуудсанд metadata, Open Graph, canonical
- JSON-LD: `Organization` (root layout), `Product`, `BreadcrumbList`
- Динамик `sitemap.ts` ба `robots.ts`
- GA4 — ecommerce эвентүүд (`view_item`, `add_to_cart`, `purchase`)
- Cookie зөвшөөрөл + дараа нь өөрчлөх товч

## 📊 Санхүүгийн тайлан ба агуулах

Тайланг санхүүд **сард 2 удаа** өгдөг тул үндсэн нэгж нь хагас сар.

### `/admin/reports` — борлуулалтын тайлан

- **Санхүүгийн задаргаа** — барааны борлуулалт, промо хөнгөлөлт, цэвэр
  барааны орлого, хүргэлтийн орлого (хэдэн удаа хүргэлт хийснийг оруулаад),
  НӨАТ, нийт дүн тус тусдаа мөр болно
- **Зарагдсан бүтээгдэхүүн** — нэр төрөл бүрээр тоо ширхэг ба дүн
- Хугацаа: `Энэ сарын 1–15` · `16-наас сүүл` · өнгөрсөн сарынх · `Сүүлийн 30 хоног`
  эсвэл гараар огноо. Сонголт URL-д хадгалагдана.

### `/admin/inventory` — агуулахын үлдэгдэл

- Бүтээгдэхүүн бүрийн **зурагтай**, үлдэгдэл ба **зарлага** (зарагдсан тоо)
- Дуусах дөхсөн / дууссан барааг тэмдэглэж, үлдэгдэл цөөрснөөр эрэмбэлнэ
- Зарлагын хугацааг сонгоно — өгөгдмөл нь "Бүх хугацаа"

### Хэвлэх

Хоёр хуудас хоёулаа **A4-т хэвлэгдэнэ** (🖨 товч). Sidebar, хугацааны сонголт
хасагдаж, оронд нь компанийн нэр, хугацаа, гаргасан огноо бүхий толгой ба
доор нь гарын үсгийн мөр гарна. Хүснэгтийн толгой хуудас бүрд давтагдана.

> ⚠️ Хугацааны логик нь **Улаанбаатарын цагаар** (UTC+8) ажиллана. Vercel
> сервер UTC-аар явдаг тул шууд `new Date()` ашиглавал сарын зааг гулсаж,
> захиалга хоёр тайланд давхар орох эсвэл хаягдах эрсдэлтэй. `report-period.ts`
> үүнийг хариуцна, тест нь заагийг мөчид нь шалгана.

## 🖥 Админ хэсэг

- **Захиалга** — дугаар/утас/нэрээр хайх, огнооны шүүлтүүр, хуудаслалт.
  "⏳ Төлөгдөөгүй" харагдацад төлбөр хүлээж буй ба төлөөгүй цуцлагдсан
  захиалга гарна. Шинэ захиалга, төлөв солигдох бүрд хуудас өөрөө
  шинэчлэгдэж (Supabase Realtime), төлөгдөхөд дэлгэцэнд мэдэгдэл гарна.
- **Шинэ захиалгын SMS** — төлбөр баталгаажмагц Тохиргоо → SMS-д заасан
  админы дугаарууд руу нэг удаа явна.
- **Бүтээгдэхүүн** — брэнд, и-баримтын GS1 кодыг заавал сонгоно; SKU
  (`VIDAN###`) автоматаар санал болгогдоно; зураг байршуулахад 870×870,
  цагаан дэвсгэртэй болж тааруулагдана.
- **Агуулах** — үлдэгдэл зөвхөн хөдөлгөөнөөр (орлого / зарлага / засвар)
  өөрчлөгдөнө. Барааны формоор шууд бичихгүй — шинэ барааны эхний
  үлдэгдэл ч орлогын хөдөлгөөн болж бүртгэгдэнэ.
- **Хэрэглэгч, Санал хүсэлт, Промо код, Ажилтан** — жагсаалт ба удирдлага.
  Ажилтны эрхийг зөвхөн `admin` удирдана.
- **Дээд мөр** — бүгдийг хайх (захиалга, бараа, хэрэглэгч), анхаарах
  зүйлсийн хонх, товч заавар. 768px-ээс доош дэлгэцэд цэс ☰-ээр гарна.

> ⚠️ Сервер талд огноо харуулахдаа `formatUbDateTime` / `formatUbDate`
> (`src/lib/datetime.ts`) хэрэглэнэ. `toLocaleString`-д `timeZone` өгөхгүй
> бол Vercel дээр UTC гарч, цаг 8 цагаар хоцорно.

> ⚠️ Локал `pnpm dev` нь **production** Supabase-тай холбогддог. Админ
> формоор туршилтын бараа, код үүсгэвэл жинхэнэ дэлгүүрт нөлөөлнө —
> идэвхгүй үүсгэж, шалгасны дараа устгана.

## 🗄 Өгөгдлийн сан

41 migration (`supabase/migrations/`). Гол RPC-үүд:

| Функц | Үүрэг |
| --- | --- |
| `place_order` | Захиалга үүсгэх — нөөц хасах, промо шалгах, дүн бодох |
| `calc_order_totals` | Дэд дүн, хөнгөлөлт, хүргэлт, НӨАТ, нийт дүн |
| `validate_promo` | Промо кодыг шалгаж хөнгөлөлт буцаах |
| `mark_order_paid` | Төлбөр төлөгдсөнийг idempotent-оор тэмдэглэх |
| `sync_sale_campaign` | Хямдралыг хугацаагаар нь асаах/унтраах |

## ⚠️ Next.js 16 онцлогууд

- `middleware.ts` → `proxy.ts` (deprecated)
- `params` ба `searchParams` нь `Promise<>` болсон — `await` хэрэгтэй
- `PageProps<'/route'>` ба `LayoutProps<'/route'>` глобал helper байгаа
- Tailwind 4 нь `@theme` directive ашигладаг (config файл байхгүй)
- JSON-LD, аналитик зэрэг элементийг **`<body>` дотор** байрлуулна —
  `<html>`-ийн шууд хүүхэд болбол бүх хуудсанд hydration алдаа гарна
