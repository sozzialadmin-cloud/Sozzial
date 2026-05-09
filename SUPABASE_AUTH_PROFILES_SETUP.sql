-- Run this in Supabase SQL editor if login works but user profiles are not created/read correctly.
-- It keeps existing data and only creates missing columns/policies/triggers.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  avatar_url text,
  role text default 'user',
  bio text,
  city text,
  favorite_slice text,
  favorite_spot_id uuid,
  instagram_url text,
  website_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists avatar_url text,
  add column if not exists role text default 'user',
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists favorite_slice text,
  add column if not exists favorite_spot_id uuid,
  add column if not exists instagram_url text,
  add column if not exists website_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
on public.profiles for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Usuario'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_username_idx on public.profiles(username);
