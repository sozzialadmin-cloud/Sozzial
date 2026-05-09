-- Pizzapolis profile data model.
-- Run this after SUPABASE_AUTH_PROFILES_SETUP.sql.

alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists neighborhood text,
  add column if not exists favorite_slice text,
  add column if not exists favorite_spot_id uuid references public.spots(id) on delete set null,
  add column if not exists pizza_style text,
  add column if not exists dietary_notes text,
  add column if not exists instagram_url text,
  add column if not exists website_url text,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists allow_profile_messages boolean not null default true,
  add column if not exists reputation_score integer not null default 0,
  add column if not exists last_seen_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Normalize duplicate usernames before enforcing uniqueness.
-- The oldest profile keeps the clean username; duplicates receive a short id suffix.
with duplicated_usernames as (
  select
    id,
    username,
    row_number() over (
      partition by lower(trim(username))
      order by created_at nulls last, id
    ) as duplicate_rank
  from public.profiles
  where username is not null and length(trim(username)) > 0
)
update public.profiles p
set username = left(trim(d.username), 22) || '_' || substring(p.id::text from 1 for 6)
from duplicated_usernames d
where p.id = d.id and d.duplicate_rank > 1;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

create index if not exists profiles_favorite_spot_id_idx on public.profiles(favorite_spot_id);
create index if not exists profiles_visibility_idx on public.profiles(profile_visibility);
create index if not exists profiles_city_idx on public.profiles(city);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
on public.profiles for select
using (profile_visibility = 'public' or auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create table if not exists public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  label text not null,
  description text,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create table if not exists public.profile_social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profile_badges enable row level security;
alter table public.profile_social_links enable row level security;

drop policy if exists "Public badges are readable" on public.profile_badges;
create policy "Public badges are readable"
on public.profile_badges for select
using (true);

drop policy if exists "Users can read own social links" on public.profile_social_links;
create policy "Users can read own social links"
on public.profile_social_links for select
using (auth.uid() = user_id);

drop policy if exists "Users can manage own social links" on public.profile_social_links;
create policy "Users can manage own social links"
on public.profile_social_links for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read avatars" on storage.objects;
create policy "Users can read avatars"
on storage.objects for select
using (bucket_id = 'avatars');
