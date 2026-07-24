-- ============================================================
-- 0014_feedback.sql
--   Хэрэглэгчийн санал хүсэлт (feedback) — вэбээс илгээнэ.
--   · Хэн ч илгээж болно (нэвтрээгүй ч).
--   · Зөвхөн staff уншина (админ хэсэгт харна).
-- ============================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text,
  category    text not null default 'suggestion'
                check (category in ('suggestion', 'complaint', 'praise', 'other')),
  message     text not null,
  is_handled  bool not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Хэн ч санал үлдээж болно (rate-limit-ийг серверийн action-д)
drop policy if exists "Feedback: public insert" on public.feedback;
create policy "Feedback: public insert" on public.feedback
  for insert with check (true);

-- Зөвхөн staff уншина / шинэчилнэ
drop policy if exists "Feedback: staff read" on public.feedback;
create policy "Feedback: staff read" on public.feedback
  for select using (public.is_staff());
drop policy if exists "Feedback: staff update" on public.feedback;
create policy "Feedback: staff update" on public.feedback
  for update using (public.is_staff());
