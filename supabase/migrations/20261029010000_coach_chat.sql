-- Переписка с тренером: отдельные лимиты на сообщения и задания на день
drop function if exists public.coach_consume(uuid, integer);
drop function if exists public.coach_refund(uuid);
drop table if exists public.coach_usage;

create table public.coach_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  kind text not null check (kind in ('chat', 'plan')),
  calls integer not null default 0,
  primary key (user_id, day, kind)
);
alter table public.coach_usage enable row level security;
create policy "coach usage read own" on public.coach_usage for select to authenticated using (user_id = auth.uid());

-- Списать одно использование. Возвращает остаток после списания или -1, если лимит исчерпан.
create or replace function public.coach_consume(p_user uuid, p_kind text, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare used integer; today date := (now() at time zone 'utc')::date;
begin
  insert into public.coach_usage (user_id, day, kind, calls) values (p_user, today, p_kind, 0) on conflict do nothing;
  update public.coach_usage set calls = calls + 1
    where user_id = p_user and day = today and kind = p_kind and calls < p_limit
    returning calls into used;
  if used is null then return -1; end if;
  return p_limit - used;
end $$;

create or replace function public.coach_refund(p_user uuid, p_kind text)
returns void language sql security definer set search_path = public as $$
  update public.coach_usage set calls = greatest(0, calls - 1)
  where user_id = p_user and day = (now() at time zone 'utc')::date and kind = p_kind;
$$;

revoke all on function public.coach_consume(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.coach_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.coach_consume(uuid, text, integer) to service_role;
grant execute on function public.coach_refund(uuid, text) to service_role;
