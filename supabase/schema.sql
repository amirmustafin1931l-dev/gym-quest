-- GymQuest: схема мультиплеера. Выполнить в SQL Editor проекта Supabase.
create extension if not exists pgcrypto;

-- Публичный снимок героя. Тренировки остаются на устройстве.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  tg_id bigint unique not null,
  name text not null default 'Атлет',
  username text,
  look jsonb not null default '{}'::jsonb,
  gear text not null default 'street',
  xp integer not null default 0,
  level integer not null default 1,
  tonnage numeric not null default 0,
  workouts integer not null default 0,
  streak integer not null default 0,
  prs integer not null default 0,
  trophies integer not null default 0,
  bests jsonb not null default '{}'::jsonb,       -- {bench, squat, deadlift, pullups}
  week jsonb not null default '{}'::jsonb,        -- {start, xp, tonnage, workouts}
  last_workout_at timestamptz,
  last_muscles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_xp_idx on public.profiles (xp desc);
create index if not exists profiles_tonnage_idx on public.profiles (tonnage desc);

-- Дружба: взаимная, хранится одной строкой с user_a < user_b
create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;

-- Читать профили могут все вошедшие; менять — только свой
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "friendships read own" on public.friendships;
create policy "friendships read own" on public.friendships for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());
drop policy if exists "friendships insert own" on public.friendships;
create policy "friendships insert own" on public.friendships for insert to authenticated with check (user_a = auth.uid() or user_b = auth.uid());
drop policy if exists "friendships delete own" on public.friendships;
create policy "friendships delete own" on public.friendships for delete to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- Добавить друга по его tg_id (вызывается после открытия ссылки-приглашения)
create or replace function public.add_friend_by_tg(friend_tg bigint)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); f public.profiles;
begin
  select * into f from public.profiles where tg_id = friend_tg;
  if f.id is null or f.id = me then return null; end if;
  insert into public.friendships (user_a, user_b) values (least(me, f.id), greatest(me, f.id)) on conflict do nothing;
  return f;
end $$;

-- Мои друзья (профили)
create or replace function public.my_friends()
returns setof public.profiles language sql security definer set search_path = public stable as $$
  select p.* from public.profiles p
  join public.friendships f on (f.user_a = auth.uid() and f.user_b = p.id) or (f.user_b = auth.uid() and f.user_a = p.id)
$$;

create or replace function public.remove_friend(friend uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.friendships where (user_a = least(auth.uid(), friend) and user_b = greatest(auth.uid(), friend));
$$;

grant execute on function public.add_friend_by_tg(bigint) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
