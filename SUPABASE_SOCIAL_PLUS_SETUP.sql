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
  event_type text not null check (event_type in ('check_in', 'review', 'plan_created', 'badge_awarded', 'spot_added', 'recipe_posted')),
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

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.activity_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%event_type%'
  loop
    execute format('alter table public.activity_events drop constraint if exists %I', constraint_name);
  end loop;

  alter table public.activity_events
  add constraint activity_events_event_type_check
  check (event_type in ('check_in', 'review', 'plan_created', 'badge_awarded', 'spot_added', 'recipe_posted'));
exception
  when duplicate_object then null;
end;
$$;
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

-- Social graph: follow public profiles and build a real people layer.
create table if not exists public.profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists profile_follows_follower_idx on public.profile_follows(follower_id, created_at desc);
create index if not exists profile_follows_following_idx on public.profile_follows(following_id, created_at desc);

alter table public.profile_follows enable row level security;

drop policy if exists "Public can read follows" on public.profile_follows;
create policy "Public can read follows"
on public.profile_follows for select
using (true);

drop policy if exists "Users can follow from own account" on public.profile_follows;
create policy "Users can follow from own account"
on public.profile_follows for insert
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow from own account" on public.profile_follows;
create policy "Users can unfollow from own account"
on public.profile_follows for delete
using (auth.uid() = follower_id);
-- Home pizza recipes: profiles can publish simple recipes and the community can like them.
create table if not exists public.home_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  dough_style text,
  difficulty text not null default 'Easy' check (difficulty in ('Easy', 'Medium', 'Advanced')),
  bake_time text,
  photo_url text,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_recipe_votes (
  recipe_id uuid not null references public.home_recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create index if not exists home_recipes_user_idx on public.home_recipes(user_id, created_at desc);
create index if not exists home_recipes_rank_idx on public.home_recipes(status, likes_count desc, created_at desc);
create index if not exists home_recipe_votes_user_idx on public.home_recipe_votes(user_id, created_at desc);

alter table public.home_recipes enable row level security;
alter table public.home_recipe_votes enable row level security;

drop policy if exists "Public can read published recipes" on public.home_recipes;
create policy "Public can read published recipes"
on public.home_recipes for select
using (status = 'published');

drop policy if exists "Users can create own recipes" on public.home_recipes;
create policy "Users can create own recipes"
on public.home_recipes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.home_recipes;
create policy "Users can update own recipes"
on public.home_recipes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can read recipe votes" on public.home_recipe_votes;
create policy "Public can read recipe votes"
on public.home_recipe_votes for select
using (true);

drop policy if exists "Users can vote recipes" on public.home_recipe_votes;
create policy "Users can vote recipes"
on public.home_recipe_votes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove own recipe votes" on public.home_recipe_votes;
create policy "Users can remove own recipe votes"
on public.home_recipe_votes for delete
using (auth.uid() = user_id);

create or replace function public.sync_home_recipe_likes()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    update public.home_recipes
    set likes_count = likes_count + 1, updated_at = now()
    where id = new.recipe_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.home_recipes
    set likes_count = greatest(0, likes_count - 1), updated_at = now()
    where id = old.recipe_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists home_recipe_votes_sync_insert on public.home_recipe_votes;
create trigger home_recipe_votes_sync_insert
after insert on public.home_recipe_votes
for each row execute function public.sync_home_recipe_likes();

drop trigger if exists home_recipe_votes_sync_delete on public.home_recipe_votes;
create trigger home_recipe_votes_sync_delete
after delete on public.home_recipe_votes
for each row execute function public.sync_home_recipe_likes();
