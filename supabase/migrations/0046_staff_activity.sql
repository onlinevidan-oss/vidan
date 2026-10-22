-- ============================================================
-- 0046_staff_activity.sql
--   Админд хэн, ямар эрхээр, юу хийснийг хүнээр нь ялгах.
--
--   1) staff_activity — ажилтны үйлдлийн түүх. actor_id / нэр / эрхийг
--      trigger өөрөө staff хүснэгтээс бөглөнө (апп-аас ирсэн утгад
--      итгэхгүй) — хэн нэгэн өөр хүний нэрээр бичиж чадахгүй.
--   2) touch_staff_login() — админд орох бүрийг (30 минутад нэг удаа)
--      бүртгэж, staff.last_login_at-ийг шинэчилнэ.
--   3) "Шивсэн" — захиалгыг гадны хүргэлтийн компанид шивсэн тэмдэглэгээ.
--      mark_courier_entered() нь эрх шалгах, нэг л удаа тэмдэглэх,
--      захиалгын түүх ба ажилтны түүхэнд бичихийг НЭГ гүйлгээнд хийнэ.
--   4) sms_settings-д "шивсэн" SMS-ийн тохиргоо (эзний дугаар 94070800).
--
--   Идемпотент.
-- ============================================================

-- ---------- 1) Ажилтны үйлдлийн түүх ----------
create table if not exists public.staff_activity (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.staff(id) on delete set null,
  actor_name  text,
  actor_role  text,
  action      text not null,
  summary     text not null,
  entity_type text,
  entity_id   text,
  created_at  timestamptz not null default now()
);
create index if not exists staff_activity_created_idx on public.staff_activity (created_at desc);
create index if not exists staff_activity_actor_idx on public.staff_activity (actor_id, created_at desc);

alter table public.staff_activity enable row level security;
drop policy if exists "Activity: admin read" on public.staff_activity;
create policy "Activity: admin read" on public.staff_activity
  for select using (public.is_admin());
drop policy if exists "Activity: staff insert own" on public.staff_activity;
create policy "Activity: staff insert own" on public.staff_activity
  for insert with check (public.is_staff());

-- Хэн бичсэнийг сервер талаас тогтооно
create or replace function public.staff_activity_fill_actor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_role text;
begin
  if auth.uid() is not null then
    new.actor_id := auth.uid();
  end if;
  select full_name, role into v_name, v_role from public.staff where id = new.actor_id;
  new.actor_name := v_name;
  new.actor_role := v_role;
  return new;
end $$;

drop trigger if exists staff_activity_fill_actor on public.staff_activity;
create trigger staff_activity_fill_actor
  before insert on public.staff_activity
  for each row execute function public.staff_activity_fill_actor();

-- ---------- 2) Админд орсныг бүртгэх ----------
create or replace function public.touch_staff_login()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows int;
begin
  if auth.uid() is null then
    return;
  end if;
  update public.staff
     set last_login_at = now()
   where id = auth.uid()
     and is_active
     and (last_login_at is null or last_login_at < now() - interval '30 minutes');
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    insert into public.staff_activity (action, summary)
    values ('login', 'Админд орсон');
  end if;
end $$;

revoke all on function public.touch_staff_login() from public, anon;
grant execute on function public.touch_staff_login() to authenticated;

-- ---------- 3) "Шивсэн" ----------
alter table public.orders
  add column if not exists courier_entered_at timestamptz,
  add column if not exists courier_entered_by uuid references public.staff(id) on delete set null,
  add column if not exists courier_entered_by_name text;

comment on column public.orders.courier_entered_at is
  'Захиалгыг гадны хүргэлтийн компанид шивсэн цаг — "Шивсэн" товч';

create or replace function public.mark_courier_entered(p_order_id uuid)
returns table(newly_marked boolean, entered_at timestamptz, entered_by_name text, order_number text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name   text;
  v_order  record;
  v_now    timestamptz := now();
begin
  select full_name into v_name
    from public.staff where id = auth.uid() and is_active;
  if v_name is null then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;

  select o.order_number, o.payment_status, o.status,
         o.courier_entered_at, o.courier_entered_by_name
    into v_order
    from public.orders o where o.id = p_order_id
    for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Аль хэдийн шивсэн — дахин тэмдэглэхгүй, SMS давхар явахгүй
  if v_order.courier_entered_at is not null then
    return query select false, v_order.courier_entered_at,
                        v_order.courier_entered_by_name, v_order.order_number;
    return;
  end if;

  if v_order.payment_status <> 'paid' or v_order.status = 'cancelled' then
    raise exception 'ORDER_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  update public.orders
     set courier_entered_at      = v_now,
         courier_entered_by      = auth.uid(),
         courier_entered_by_name = v_name
   where id = p_order_id;

  insert into public.order_events (order_id, event_type, description, created_by)
  values (p_order_id, 'courier_entered',
          'Хүргэлтийн компанид шивсэн — ' || v_name, auth.uid());

  insert into public.staff_activity (action, summary, entity_type, entity_id)
  values ('courier_entered', v_order.order_number || ' захиалгыг шивсэн',
          'order', p_order_id::text);

  return query select true, v_now, v_name, v_order.order_number;
end $$;

revoke all on function public.mark_courier_entered(uuid) from public, anon;
grant execute on function public.mark_courier_entered(uuid) to authenticated;

-- "Шивсэн" SMS нэг захиалгад нэг л удаа
create unique index if not exists order_events_sms_entered_once_idx
  on public.order_events (order_id, event_type)
  where event_type = 'sms_courier_entered';

-- ---------- 4) SMS тохиргоо ----------
update public.site_settings
   set value = value || jsonb_build_object(
         'entered_enabled',  true,
         'entered_phones',   '94070800',
         'entered_template', '{staff} {order} захиалгыг шивлээ'
       ),
       updated_at = now()
 where key = 'sms_settings'
   and not (value ? 'entered_phones');

-- ---------- 5) Өөрийгөө шалгах ----------
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'orders'
                    and column_name = 'courier_entered_at') then
    raise exception 'orders.courier_entered_at үүссэнгүй';
  end if;
  -- Нэвтрээгүй (auth.uid() = null) үед "Шивсэн" татгалзах ёстой
  begin
    perform public.mark_courier_entered(gen_random_uuid());
    raise exception 'mark_courier_entered нэвтрээгүй хүнд зөвшөөрөгдлөө';
  exception when others then
    if sqlerrm <> 'NOT_STAFF' then raise; end if;
  end;
end $$;
