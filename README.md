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
- [ ] **Phase 7** — QPay интеграц
- [ ] **Phase 8** — Order management
- [ ] **Phase 9** — Reports
- [ ] **Phase 10** — Promotions
- [ ] **Phase 11** — Notifications
- [ ] **Phase 12** — Production deploy

## ⚠️ Next.js 16 онцлогууд

- `middleware.ts` → `proxy.ts` (deprecated)
- `params` ба `searchParams` нь `Promise<>` болсон — `await` хэрэгтэй
- `PageProps<'/route'>` ба `LayoutProps<'/route'>` глобал helper байгаа
- Tailwind 4 нь `@theme` directive ашигладаг (config файл байхгүй)
