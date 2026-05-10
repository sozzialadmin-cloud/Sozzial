-- Sozzial base app schema.
-- Run this after SUPABASE_AUTH_PROFILES_SETUP.sql and before the extension files.

create extension if not exists pgcrypto;

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  slice_price numeric(8,2),
  best_slice text,
  quick_note text,
  photo_url text,
  status text not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  average_rating numeric(3,2) not null default 0,
  ratings_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spots
  add column if not exists name text,
  add column if not exists address text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists slice_price numeric(8,2),
  add column if not exists best_slice text,
  add column if not exists quick_note text,
  add column if not exists photo_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists average_rating numeric(3,2) not null default 0,
  add column if not exists ratings_count integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spots_status_check'
      and conrelid = 'public.spots'::regclass
  ) then
    alter table public.spots
      add constraint spots_status_check
      check (status in ('pending', 'approved', 'rejected', 'hidden'));
  end if;
end $$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  title text not null,
  plan_date date,
  plan_time time,
  max_people integer not null default 4,
  quick_note text,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'plans_status_check'
      and conrelid = 'public.plans'::regclass
  ) then
    alter table public.plans
      add constraint plans_status_check
      check (status in ('active', 'full', 'cancelled', 'completed'));
  end if;
end $$;

create table if not exists public.plan_members (
  id uuid not null default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'joined',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'plan_members_status_check'
      and conrelid = 'public.plan_members'::regclass
  ) then
    alter table public.plan_members
      add constraint plan_members_status_check
      check (status in ('joined', 'left', 'removed'));
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.spot_ratings (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating numeric(2,1) not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spot_id, user_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spot_ratings_rating_check'
      and conrelid = 'public.spot_ratings'::regclass
  ) then
    alter table public.spot_ratings
      add constraint spot_ratings_rating_check
      check (rating >= 1 and rating <= 5);
  end if;
end $$;

create table if not exists public.spot_comments (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spot_comments_status_check'
      and conrelid = 'public.spot_comments'::regclass
  ) then
    alter table public.spot_comments
      add constraint spot_comments_status_check
      check (status in ('approved', 'pending', 'hidden', 'deleted'));
  end if;
end $$;

create table if not exists public.spot_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  photo_url text not null,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spot_photos_status_check'
      and conrelid = 'public.spot_photos'::regclass
  ) then
    alter table public.spot_photos
      add constraint spot_photos_status_check
      check (status in ('approved', 'pending', 'hidden', 'deleted'));
  end if;
end $$;

create index if not exists spots_status_created_idx on public.spots(status, created_at desc);
create index if not exists spots_location_idx on public.spots(lat, lng);
create index if not exists spots_created_by_idx on public.spots(created_by, created_at desc);
create index if not exists plans_spot_idx on public.plans(spot_id, status, plan_date);
create index if not exists plans_created_by_idx on public.plans(created_by, created_at desc);
create index if not exists plan_members_user_idx on public.plan_members(user_id, created_at desc);
create index if not exists messages_plan_created_idx on public.messages(plan_id, created_at);
create index if not exists spot_ratings_user_idx on public.spot_ratings(user_id, updated_at desc);
create index if not exists spot_comments_spot_idx on public.spot_comments(spot_id, created_at desc);
create index if not exists spot_comments_user_idx on public.spot_comments(user_id, created_at desc);
create index if not exists spot_photos_spot_idx on public.spot_photos(spot_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spots_touch_updated_at on public.spots;
create trigger spots_touch_updated_at
before update on public.spots
for each row execute function public.touch_updated_at();

drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
before update on public.plans
for each row execute function public.touch_updated_at();

drop trigger if exists plan_members_touch_updated_at on public.plan_members;
create trigger plan_members_touch_updated_at
before update on public.plan_members
for each row execute function public.touch_updated_at();

drop trigger if exists spot_ratings_touch_updated_at on public.spot_ratings;
create trigger spot_ratings_touch_updated_at
before update on public.spot_ratings
for each row execute function public.touch_updated_at();

drop trigger if exists spot_comments_touch_updated_at on public.spot_comments;
create trigger spot_comments_touch_updated_at
before update on public.spot_comments
for each row execute function public.touch_updated_at();

create or replace function public.refresh_spot_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_spot_id uuid;
begin
  target_spot_id = coalesce(new.spot_id, old.spot_id);

  update public.spots
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.spot_ratings
      where spot_id = target_spot_id
    ), 0),
    ratings_count = (
      select count(*)
      from public.spot_ratings
      where spot_id = target_spot_id
    )
  where id = target_spot_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists spot_ratings_refresh_spot_rating on public.spot_ratings;
create trigger spot_ratings_refresh_spot_rating
after insert or update or delete on public.spot_ratings
for each row execute function public.refresh_spot_rating();

alter table public.spots enable row level security;
alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.messages enable row level security;
alter table public.spot_ratings enable row level security;
alter table public.spot_comments enable row level security;
alter table public.spot_photos enable row level security;

drop policy if exists "Public can read approved spots" on public.spots;
create policy "Public can read approved spots"
on public.spots for select
using (status = 'approved' or auth.uid() = created_by);

drop policy if exists "Signed in users can add spots" on public.spots;
create policy "Signed in users can add spots"
on public.spots for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update own pending spots" on public.spots;
create policy "Users can update own pending spots"
on public.spots for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Public can read active plans" on public.plans;
create policy "Public can read active plans"
on public.plans for select
using (status = 'active' or auth.uid() = created_by);

drop policy if exists "Signed in users can create plans" on public.plans;
create policy "Signed in users can create plans"
on public.plans for insert
with check (auth.uid() = created_by);

drop policy if exists "Plan creators can update plans" on public.plans;
create policy "Plan creators can update plans"
on public.plans for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can read plan members" on public.plan_members;
create policy "Users can read plan members"
on public.plan_members for select
using (true);

drop policy if exists "Users can join plans" on public.plan_members;
create policy "Users can join plans"
on public.plan_members for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own membership" on public.plan_members;
create policy "Users can update own membership"
on public.plan_members for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read plan messages" on public.messages;
create policy "Users can read plan messages"
on public.messages for select
using (
  exists (
    select 1 from public.plan_members pm
    where pm.plan_id = messages.plan_id
      and pm.user_id = auth.uid()
      and pm.status = 'joined'
  )
  or exists (
    select 1 from public.plans p
    where p.id = messages.plan_id
      and p.created_by = auth.uid()
  )
);

drop policy if exists "Plan members can write messages" on public.messages;
create policy "Plan members can write messages"
on public.messages for insert
with check (
  auth.uid() = user_id
  and (
    exists (
      select 1 from public.plan_members pm
      where pm.plan_id = messages.plan_id
        and pm.user_id = auth.uid()
        and pm.status = 'joined'
    )
    or exists (
      select 1 from public.plans p
      where p.id = messages.plan_id
        and p.created_by = auth.uid()
    )
  )
);

drop policy if exists "Public can read spot ratings" on public.spot_ratings;
create policy "Public can read spot ratings"
on public.spot_ratings for select
using (true);

drop policy if exists "Users can rate spots" on public.spot_ratings;
create policy "Users can rate spots"
on public.spot_ratings for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own ratings" on public.spot_ratings;
create policy "Users can update own ratings"
on public.spot_ratings for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own ratings" on public.spot_ratings;
create policy "Users can delete own ratings"
on public.spot_ratings for delete
using (auth.uid() = user_id);

drop policy if exists "Public can read approved spot comments" on public.spot_comments;
create policy "Public can read approved spot comments"
on public.spot_comments for select
using (status = 'approved' or auth.uid() = user_id);

drop policy if exists "Users can comment on spots" on public.spot_comments;
create policy "Users can comment on spots"
on public.spot_comments for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments" on public.spot_comments;
create policy "Users can update own comments"
on public.spot_comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read approved spot photos" on public.spot_photos;
create policy "Public can read approved spot photos"
on public.spot_photos for select
using (status = 'approved' or auth.uid() = user_id);

drop policy if exists "Users can add spot photos" on public.spot_photos;
create policy "Users can add spot photos"
on public.spot_photos for insert
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('spot-photos', 'spot-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload spot photos" on storage.objects;
create policy "Users can upload spot photos"
on storage.objects for insert
with check (
  bucket_id = 'spot-photos'
  and auth.role() = 'authenticated'
);

drop policy if exists "Users can read spot photos" on storage.objects;
create policy "Users can read spot photos"
on storage.objects for select
using (bucket_id = 'spot-photos');
