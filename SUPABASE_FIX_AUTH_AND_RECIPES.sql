-- SOZZIAL EMERGENCY FIX: auth profile creation + home recipes.
-- Run this whole file once in Supabase SQL Editor. Safe to rerun.

create extension if not exists pgcrypto;

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
  add column if not exists neighborhood text,
  add column if not exists favorite_slice text,
  add column if not exists favorite_spot_id uuid,
  add column if not exists pizza_style text,
  add column if not exists dietary_notes text,
  add column if not exists instagram_url text,
  add column if not exists website_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

with ranked as (
  select id, username,
    row_number() over (partition by lower(trim(username)) order by coalesce(created_at, now()), id) as rn
  from public.profiles
  where username is not null and trim(username) <> ''
)
update public.profiles p
set username = left(regexp_replace(lower(coalesce(nullif(trim(r.username), ''), 'user')), '[^a-z0-9_]+', '_', 'g'), 18)
               || '_' || substr(replace(p.id::text, '-', ''), 1, 6)
from ranked r
where p.id = r.id and r.rn > 1;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and trim(username) <> '';

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix text;
  attempt integer := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), nullif(new.raw_user_meta_data->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1), 'user'),
    '[^a-z0-9_]+', '_', 'g'
  ));
  base_username := trim(both '_' from base_username);
  if base_username is null or base_username = '' then base_username := 'user'; end if;

  suffix := substr(replace(new.id::text, '-', ''), 1, 6);
  candidate_username := left(base_username, 24);

  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate_username) and p.id <> new.id) loop
    attempt := attempt + 1;
    candidate_username := left(base_username, 18) || '_' || suffix;
    if attempt > 1 then candidate_username := left(base_username, 16) || '_' || suffix || attempt::text; end if;
  end loop;

  insert into public.profiles (id, email, username, avatar_url, role, created_at, updated_at)
  values (new.id, new.email, candidate_username, coalesce(new.raw_user_meta_data->>'avatar_url', ''), 'user', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(nullif(public.profiles.username, ''), excluded.username),
    avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_created_idx on public.profiles(created_at desc);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.activity_events'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%event_type%'
  loop
    execute format('alter table public.activity_events drop constraint if exists %I', constraint_name);
  end loop;
  alter table public.activity_events add constraint activity_events_event_type_check
  check (event_type in ('check_in','review','plan_created','badge_awarded','spot_added','recipe_posted','profile_follow','profile_followed','comment_added'));
exception when duplicate_object then null;
end;
$$;

alter table public.activity_events enable row level security;
create index if not exists activity_events_created_idx on public.activity_events(created_at desc);
create index if not exists activity_events_user_idx on public.activity_events(user_id, created_at desc);

drop policy if exists "Public can read activity" on public.activity_events;
create policy "Public can read activity" on public.activity_events for select using (true);

drop policy if exists "Users can create own activity" on public.activity_events;
create policy "Users can create own activity" on public.activity_events for insert with check (auth.uid() = user_id);

create table if not exists public.home_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  dough_style text,
  difficulty text not null default 'Easy',
  bake_time text,
  photo_url text,
  ingredients text,
  preparation_steps text,
  oven_temp text,
  servings text,
  tags text[] not null default '{}'::text[],
  status text not null default 'published',
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_recipes
  add column if not exists dough_style text,
  add column if not exists difficulty text not null default 'Easy',
  add column if not exists bake_time text,
  add column if not exists photo_url text,
  add column if not exists ingredients text,
  add column if not exists preparation_steps text,
  add column if not exists oven_temp text,
  add column if not exists servings text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists status text not null default 'published',
  add column if not exists likes_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.home_recipes drop constraint if exists home_recipes_difficulty_check;
alter table public.home_recipes add constraint home_recipes_difficulty_check check (difficulty in ('Easy','Medium','Advanced'));
alter table public.home_recipes drop constraint if exists home_recipes_status_check;
alter table public.home_recipes add constraint home_recipes_status_check check (status in ('published','hidden','removed'));

create table if not exists public.home_recipe_votes (
  recipe_id uuid not null references public.home_recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table if not exists public.home_recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.home_recipes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  status text not null default 'approved',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_recipes enable row level security;
alter table public.home_recipe_votes enable row level security;
alter table public.home_recipe_comments enable row level security;

create index if not exists home_recipes_user_idx on public.home_recipes(user_id, created_at desc);
create index if not exists home_recipes_rank_idx on public.home_recipes(status, likes_count desc, created_at desc);
create index if not exists home_recipe_votes_user_idx on public.home_recipe_votes(user_id, created_at desc);
create index if not exists home_recipe_comments_recipe_idx on public.home_recipe_comments(recipe_id, created_at desc);

drop policy if exists "Public can read published recipes" on public.home_recipes;
create policy "Public can read published recipes" on public.home_recipes for select using (status = 'published');
drop policy if exists "Users can create own recipes" on public.home_recipes;
create policy "Users can create own recipes" on public.home_recipes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own recipes" on public.home_recipes;
create policy "Users can update own recipes" on public.home_recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public can read recipe votes" on public.home_recipe_votes;
create policy "Public can read recipe votes" on public.home_recipe_votes for select using (true);
drop policy if exists "Users can vote recipes" on public.home_recipe_votes;
create policy "Users can vote recipes" on public.home_recipe_votes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove own recipe votes" on public.home_recipe_votes;
create policy "Users can remove own recipe votes" on public.home_recipe_votes for delete using (auth.uid() = user_id);

drop policy if exists "Anyone can read visible recipe comments" on public.home_recipe_comments;
create policy "Anyone can read visible recipe comments" on public.home_recipe_comments for select using (status <> 'hidden');
drop policy if exists "Users can add recipe comments" on public.home_recipe_comments;
create policy "Users can add recipe comments" on public.home_recipe_comments for insert with check (auth.uid() = user_id);

create or replace function public.sync_home_recipe_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.home_recipes set likes_count = likes_count + 1, updated_at = now() where id = new.recipe_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.home_recipes set likes_count = greatest(0, likes_count - 1), updated_at = now() where id = old.recipe_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists home_recipe_votes_sync_insert on public.home_recipe_votes;
create trigger home_recipe_votes_sync_insert after insert on public.home_recipe_votes for each row execute function public.sync_home_recipe_likes();
drop trigger if exists home_recipe_votes_sync_delete on public.home_recipe_votes;
create trigger home_recipe_votes_sync_delete after delete on public.home_recipe_votes for each row execute function public.sync_home_recipe_likes();