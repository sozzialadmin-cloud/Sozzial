-- Sozzial clean schema.
-- Run this in a new Supabase project SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  city text,
  favorite_slice text,
  reputation_score integer not null default 0,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  area text,
  lat numeric,
  lng numeric,
  slice_price numeric(8,2),
  best_slice text,
  photo_url text,
  average_rating numeric(3,2) not null default 0,
  ratings_count integer not null default 0,
  status text not null default 'approved',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  spot_id uuid references public.spots(id) on delete set null,
  created_by uuid references auth.users(id) on delete cascade,
  plan_date date not null,
  plan_time time,
  max_people integer not null default 4,
  note text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.plan_members (
  plan_id uuid references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'joined',
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete cascade,
  slice_price numeric(8,2),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  spot_id uuid references public.spots(id) on delete cascade,
  rating numeric(2,1),
  content text,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username))
where username is not null and length(trim(username)) > 0;

create index if not exists spots_status_idx on public.spots(status);
create index if not exists plans_status_date_idx on public.plans(status, plan_date);
create index if not exists check_ins_user_idx on public.check_ins(user_id, created_at desc);
create index if not exists activity_events_created_idx on public.activity_events(created_at desc);

alter table public.profiles enable row level security;
alter table public.spots enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.check_ins enable row level security;
alter table public.reviews enable row level security;
alter table public.activity_events enable row level security;
alter table public.reports enable row level security;

create policy "Public profiles readable" on public.profiles for select using (true);
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Approved spots readable" on public.spots for select using (status = 'approved' or auth.uid() = created_by);
create policy "Users create spots" on public.spots for insert with check (auth.uid() = created_by);

create policy "Active plans readable" on public.plans for select using (status = 'active' or auth.uid() = created_by);
create policy "Users create plans" on public.plans for insert with check (auth.uid() = created_by);

create policy "Members readable" on public.plan_members for select using (true);
create policy "Users join plans" on public.plan_members for insert with check (auth.uid() = user_id);

create policy "Check-ins readable" on public.check_ins for select using (true);
create policy "Users create own check-ins" on public.check_ins for insert with check (auth.uid() = user_id);

create policy "Reviews readable" on public.reviews for select using (status = 'approved' or auth.uid() = user_id);
create policy "Users create own reviews" on public.reviews for insert with check (auth.uid() = user_id);

create policy "Activity readable" on public.activity_events for select using (true);
create policy "Users create own activity" on public.activity_events for insert with check (auth.uid() = user_id);

create policy "Users create reports" on public.reports for insert with check (auth.uid() = reporter_id or reporter_id is null);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
