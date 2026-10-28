-- Общий ИИ-тренер: учёт звонков в день на игрока
create table if not exists public.coach_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  calls integer not null default 0,
  primary key (user_id, day)
);
alter table public.coach_usage enable row level security;
drop policy if exists "coach usage read own" on public.coach_usage;
create policy "coach usage read own" on public.coach_usage for select to authenticated using (user_id = auth.uid());

-- Списать звонок. Возвращает, сколько осталось после списания, или -1, если лимит исчерпан.
-- Вызывается только сервером (service_role) из функции coach.
create or replace function public.coach_consume(p_user uuid, p_limit integer)
returns integer language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  insert into public.coach_usage (user_id, day, calls) values (p_user, (now() at time zone 'utc')::date, 0)
  on conflict (user_id, day) do nothing;
  update public.coach_usage set calls = calls + 1
    where user_id = p_user and day = (now() at time zone 'utc')::date and calls < p_limit
    returning calls into used;
  if used is null then return -1; end if;
  return p_limit - used;
end $$;
revoke all on function public.coach_consume(uuid, integer) from public, anon, authenticated;
grant execute on function public.coach_consume(uuid, integer) to service_role;

-- Вернуть звонок, если ответ не получен (ошибка API)
create or replace function public.coach_refund(p_user uuid)
returns void language sql security definer set search_path = public as $$
  update public.coach_usage set calls = greatest(0, calls - 1) where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;
revoke all on function public.coach_refund(uuid) from public, anon, authenticated;
grant execute on function public.coach_refund(uuid) to service_role;
