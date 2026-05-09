-- Sozzial social-plus features: check-ins, passport progress and public activity feed.
-- Run after the auth/profile/product SQL files.

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete cascade,
  slice_price numeric(8,2),
  note text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('check_in', 'review', 'plan_created', 'badge_awarded', 'spot_added')),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.passport_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  label text not null,
  description text,
  progress integer not null default 0,
  target integer not null default 1,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists check_ins_user_created_idx on public.check_ins(user_id, created_at desc);
create index if not exists check_ins_spot_created_idx on public.check_ins(spot_id, created_at desc);
create index if not exists activity_events_created_idx on public.activity_events(created_at desc);
create index if not exists activity_events_user_idx on public.activity_events(user_id, created_at desc);
create index if not exists passport_badges_user_idx on public.passport_badges(user_id);

alter table public.check_ins enable row level security;
alter table public.activity_events enable row level security;
alter table public.passport_badges enable row level security;

drop policy if exists "Public can read check-ins" on public.check_ins;
create policy "Public can read check-ins" on public.check_ins for select using (true);

drop policy if exists "Users can create own check-ins" on public.check_ins;
create policy "Users can create own check-ins" on public.check_ins for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own check-ins" on public.check_ins;
create policy "Users can update own check-ins" on public.check_ins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public can read activity" on public.activity_events;
create policy "Public can read activity" on public.activity_events for select using (true);

drop policy if exists "Users can create own activity" on public.activity_events;
create policy "Users can create own activity" on public.activity_events for insert with check (auth.uid() = user_id);

drop policy if exists "Users can read own passport badges" on public.passport_badges;
create policy "Users can read own passport badges" on public.passport_badges for select using (auth.uid() = user_id);

drop policy if exists "Users can manage own passport badges" on public.passport_badges;
create policy "Users can manage own passport badges" on public.passport_badges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
