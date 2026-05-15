-- Sozzial security hardening.
-- Run this file LAST in Supabase SQL Editor, after all other SUPABASE_*.sql files.
-- Covers: admin checks, protected roles, account status, moderation policies, reports, storage hardening,
-- admin audit logs, delete-account request and basic anti-spam limits.

create extension if not exists pgcrypto;

-- 1) Profiles: protected role/account fields + account status.
alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists suspended_until timestamptz,
  add column if not exists warning_count integer not null default 0,
  add column if not exists moderation_note text,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active', 'warned', 'suspended', 'banned', 'deleted'));

create index if not exists profiles_account_status_idx on public.profiles(account_status, suspended_until);
create index if not exists profiles_role_status_idx on public.profiles(role, account_status);

-- Fix username creation from Google/OAuth. Previous regex removed uppercase before lowercasing
-- so "Jose Rubio" could become "ose_ubio".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  base_username text;
  candidate_username text;
  suffix text;
  attempt integer := 0;
begin
  raw_name := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'user'
  );

  base_username := regexp_replace(lower(raw_name), '[^a-z0-9_]+', '_', 'g');
  base_username := trim(both '_' from base_username);
  if base_username is null or base_username = '' then base_username := 'user'; end if;

  suffix := substr(replace(new.id::text, '-', ''), 1, 6);
  candidate_username := left(base_username, 24);

  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate_username) and p.id <> new.id) loop
    attempt := attempt + 1;
    candidate_username := left(base_username, 18) || '_' || suffix;
    if attempt > 1 then candidate_username := left(base_username, 16) || '_' || suffix || attempt::text; end if;
  end loop;

  insert into public.profiles (id, email, username, avatar_url, role, account_status, created_at, updated_at)
  values (new.id, new.email, candidate_username, coalesce(new.raw_user_meta_data->>'avatar_url', ''), 'user', 'active', now(), now())
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

-- 2) Safe admin and account-state helpers.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status in ('active', 'warned')
      and (p.suspended_until is null or p.suspended_until <= now())
      and p.deleted_at is null
  );
$$;

create or replace function public.account_can_interact(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.account_status in ('active', 'warned')
      and (p.suspended_until is null or p.suspended_until <= now())
      and p.deleted_at is null
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.account_can_interact(uuid) to authenticated;

-- 1) Block users from changing their own role/account-status/moderation fields.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.allow_profile_security_update', true) = 'true' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.id then
    new.role := old.role;
    new.account_status := old.account_status;
    new.suspended_until := old.suspended_until;
    new.warning_count := old.warning_count;
    new.moderation_note := old.moderation_note;
    new.deletion_requested_at := old.deletion_requested_at;
    new.deleted_at := old.deleted_at;
    return new;
  end if;

  raise exception 'Only admins can change protected profile fields.';
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

-- 5) Reports: allow recipes and recipe comments too.
alter table public.reports drop constraint if exists reports_entity_type_check;
alter table public.reports add constraint reports_entity_type_check
check (entity_type in ('spot', 'comment', 'photo', 'plan', 'profile', 'user', 'message', 'recipe', 'recipe_comment'));

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check
check (status in ('open', 'reviewing', 'resolved', 'dismissed'));

-- 9) Real admin audit logs.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs(admin_id, created_at desc);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id, created_at desc);

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
create policy "Admins can read audit logs" on public.admin_audit_logs for select using (public.is_admin());

drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;
create policy "Admins can insert audit logs" on public.admin_audit_logs for insert with check (public.is_admin());

create or replace function public.log_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id uuid;
  action_name text;
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    row_id := (to_jsonb(old)->>'id')::uuid;
  else
    row_id := (to_jsonb(new)->>'id')::uuid;
  end if;

  action_name := lower(tg_table_name || '_' || tg_op);

  insert into public.admin_audit_logs(admin_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    action_name,
    tg_table_name,
    row_id,
    jsonb_build_object(
      'op', tg_op,
      'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    )
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles','reports','spots','plans','spot_comments','spot_photos','home_recipes','home_recipe_comments'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists admin_audit_%I on public.%I', t, t);
      execute format('create trigger admin_audit_%I after update or delete on public.%I for each row execute function public.log_admin_change()', t, t);
    end if;
  end loop;
end $$;

-- 3) RLS policies: admins can moderate real tables; users can only manage their own active account/content.
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are readable" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Public can read visible profiles"
on public.profiles for select
using (
  public.is_admin()
  or auth.uid() = id
  or (profile_visibility = 'public' and account_status <> 'deleted')
);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id and coalesce(role, 'user') = 'user');

create policy "Users can update own safe profile"
on public.profiles for update
using (auth.uid() = id and public.account_can_interact(auth.uid()))
with check (auth.uid() = id);

create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

-- reports
alter table public.reports enable row level security;
drop policy if exists "Signed in users can create reports" on public.reports;
drop policy if exists "Reporters can read own reports" on public.reports;
drop policy if exists "Admins can read all reports" on public.reports;
drop policy if exists "Admins can update reports" on public.reports;
drop policy if exists "Admins can delete reports" on public.reports;

create policy "Signed in users can create reports"
on public.reports for insert
with check (auth.uid() = reporter_id and public.account_can_interact(auth.uid()));

create policy "Reporters can read own reports"
on public.reports for select
using (auth.uid() = reporter_id or public.is_admin());

create policy "Admins can update reports"
on public.reports for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete reports"
on public.reports for delete
using (public.is_admin());

-- spots
alter table public.spots enable row level security;
drop policy if exists "Public can read approved spots" on public.spots;
drop policy if exists "Signed in users can add spots" on public.spots;
drop policy if exists "Users can update own pending spots" on public.spots;
drop policy if exists "Admins can read all spots" on public.spots;
drop policy if exists "Admins can moderate spots" on public.spots;
drop policy if exists "Admins can delete spots" on public.spots;

create policy "Public can read approved spots"
on public.spots for select
using (public.is_admin() or status = 'approved' or auth.uid() = created_by);

create policy "Signed in users can add spots"
on public.spots for insert
with check (auth.uid() = created_by and public.account_can_interact(auth.uid()));

create policy "Users can update own pending spots"
on public.spots for update
using (auth.uid() = created_by and status in ('pending', 'rejected') and public.account_can_interact(auth.uid()))
with check (auth.uid() = created_by and status in ('pending', 'rejected'));

create policy "Admins can moderate spots"
on public.spots for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete spots"
on public.spots for delete
using (public.is_admin());

-- plans
alter table public.plans enable row level security;
drop policy if exists "Public can read active plans" on public.plans;
drop policy if exists "Signed in users can create plans" on public.plans;
drop policy if exists "Plan creators can update plans" on public.plans;
drop policy if exists "Admins can read all plans" on public.plans;
drop policy if exists "Admins can moderate plans" on public.plans;
drop policy if exists "Admins can delete plans" on public.plans;

create policy "Public can read active plans"
on public.plans for select
using (public.is_admin() or status = 'active' or auth.uid() = created_by);

create policy "Signed in users can create plans"
on public.plans for insert
with check (auth.uid() = created_by and public.account_can_interact(auth.uid()));

create policy "Plan creators can update plans"
on public.plans for update
using (auth.uid() = created_by and public.account_can_interact(auth.uid()))
with check (auth.uid() = created_by);

create policy "Admins can moderate plans"
on public.plans for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete plans"
on public.plans for delete
using (public.is_admin());

-- plan members
alter table public.plan_members enable row level security;
drop policy if exists "Users can read plan members" on public.plan_members;
drop policy if exists "Users can join plans" on public.plan_members;
drop policy if exists "Users can update own membership" on public.plan_members;
drop policy if exists "Admins can manage plan members" on public.plan_members;

create policy "Users can read plan members"
on public.plan_members for select
using (true);

create policy "Users can join plans"
on public.plan_members for insert
with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));

create policy "Users can update own membership"
on public.plan_members for update
using (auth.uid() = user_id and public.account_can_interact(auth.uid()))
with check (auth.uid() = user_id);

create policy "Admins can manage plan members"
on public.plan_members for all
using (public.is_admin())
with check (public.is_admin());

-- messages
alter table public.messages enable row level security;
drop policy if exists "Users can read plan messages" on public.messages;
drop policy if exists "Plan members can write messages" on public.messages;
drop policy if exists "Admins can read all messages" on public.messages;
drop policy if exists "Admins can moderate messages" on public.messages;

create policy "Users can read plan messages"
on public.messages for select
using (
  public.is_admin()
  or exists (select 1 from public.plan_members pm where pm.plan_id = messages.plan_id and pm.user_id = auth.uid() and pm.status = 'joined')
  or exists (select 1 from public.plans p where p.id = messages.plan_id and p.created_by = auth.uid())
);

create policy "Plan members can write messages"
on public.messages for insert
with check (
  auth.uid() = user_id
  and public.account_can_interact(auth.uid())
  and (
    exists (select 1 from public.plan_members pm where pm.plan_id = messages.plan_id and pm.user_id = auth.uid() and pm.status = 'joined')
    or exists (select 1 from public.plans p where p.id = messages.plan_id and p.created_by = auth.uid())
  )
);

create policy "Admins can moderate messages"
on public.messages for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete messages"
on public.messages for delete
using (public.is_admin());

-- spot ratings/comments/photos
alter table public.spot_ratings enable row level security;
drop policy if exists "Users can rate spots" on public.spot_ratings;
drop policy if exists "Users can update own ratings" on public.spot_ratings;
drop policy if exists "Users can delete own ratings" on public.spot_ratings;
create policy "Users can rate spots" on public.spot_ratings for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
create policy "Users can update own ratings" on public.spot_ratings for update using (auth.uid() = user_id and public.account_can_interact(auth.uid())) with check (auth.uid() = user_id);
create policy "Users can delete own ratings" on public.spot_ratings for delete using (auth.uid() = user_id or public.is_admin());

alter table public.spot_comments enable row level security;
drop policy if exists "Public can read approved spot comments" on public.spot_comments;
drop policy if exists "Users can comment on spots" on public.spot_comments;
drop policy if exists "Users can update own comments" on public.spot_comments;
drop policy if exists "Admins can moderate spot comments" on public.spot_comments;
drop policy if exists "Admins can delete spot comments" on public.spot_comments;
create policy "Public can read approved spot comments" on public.spot_comments for select using (public.is_admin() or status = 'approved' or auth.uid() = user_id);
create policy "Users can comment on spots" on public.spot_comments for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
create policy "Users can update own comments" on public.spot_comments for update using (auth.uid() = user_id and public.account_can_interact(auth.uid())) with check (auth.uid() = user_id);
create policy "Admins can moderate spot comments" on public.spot_comments for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete spot comments" on public.spot_comments for delete using (public.is_admin());

alter table public.spot_photos enable row level security;
drop policy if exists "Public can read approved spot photos" on public.spot_photos;
drop policy if exists "Users can add spot photos" on public.spot_photos;
drop policy if exists "Admins can moderate spot photos" on public.spot_photos;
drop policy if exists "Admins can delete spot photos" on public.spot_photos;
create policy "Public can read approved spot photos" on public.spot_photos for select using (public.is_admin() or status = 'approved' or auth.uid() = user_id);
create policy "Users can add spot photos" on public.spot_photos for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
create policy "Admins can moderate spot photos" on public.spot_photos for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete spot photos" on public.spot_photos for delete using (public.is_admin() or auth.uid() = user_id);

-- home recipes + comments
alter table public.home_recipes enable row level security;
drop policy if exists "Public can read published recipes" on public.home_recipes;
drop policy if exists "Users can create own recipes" on public.home_recipes;
drop policy if exists "Users can update own recipes" on public.home_recipes;
drop policy if exists "Admins can read all recipes" on public.home_recipes;
drop policy if exists "Admins can moderate recipes" on public.home_recipes;
drop policy if exists "Admins can delete recipes" on public.home_recipes;
create policy "Public can read published recipes" on public.home_recipes for select using (public.is_admin() or status = 'published' or auth.uid() = user_id);
create policy "Users can create own recipes" on public.home_recipes for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
create policy "Users can update own recipes" on public.home_recipes for update using (auth.uid() = user_id and public.account_can_interact(auth.uid())) with check (auth.uid() = user_id);
create policy "Admins can moderate recipes" on public.home_recipes for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete recipes" on public.home_recipes for delete using (public.is_admin());

alter table public.home_recipe_comments enable row level security;
drop policy if exists "Anyone can read visible recipe comments" on public.home_recipe_comments;
drop policy if exists "Users can add recipe comments" on public.home_recipe_comments;
drop policy if exists "Admins can moderate recipe comments" on public.home_recipe_comments;
drop policy if exists "Admins can delete recipe comments" on public.home_recipe_comments;
create policy "Anyone can read visible recipe comments" on public.home_recipe_comments for select using (public.is_admin() or status <> 'hidden' or auth.uid() = user_id);
create policy "Users can add recipe comments" on public.home_recipe_comments for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
create policy "Admins can moderate recipe comments" on public.home_recipe_comments for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete recipe comments" on public.home_recipe_comments for delete using (public.is_admin());

-- follows / saved spots / activity / badges: basic active-account checks where users write.
do $$
begin
  if to_regclass('public.profile_follows') is not null then
    drop policy if exists "Users can follow from own account" on public.profile_follows;
    create policy "Users can follow from own account" on public.profile_follows for insert with check (auth.uid() = follower_id and public.account_can_interact(auth.uid()));
  end if;
  if to_regclass('public.saved_spots') is not null then
    drop policy if exists "Users can save own spots" on public.saved_spots;
    create policy "Users can save own spots" on public.saved_spots for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
  end if;
  if to_regclass('public.activity_events') is not null then
    drop policy if exists "Users can create own activity" on public.activity_events;
    create policy "Users can create own activity" on public.activity_events for insert with check (auth.uid() = user_id and public.account_can_interact(auth.uid()));
  end if;
end $$;

-- 8) Storage hardening: private buckets, user folders, image extensions, image MIME when provided.
insert into storage.buckets (id, name, public)
values ('spot-photos', 'spot-photos', false), ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload spot photos" on storage.objects;
drop policy if exists "Users can read spot photos" on storage.objects;
drop policy if exists "Users can update own spot photos" on storage.objects;
drop policy if exists "Users can delete own spot photos" on storage.objects;
drop policy if exists "Admins can manage spot photo objects" on storage.objects;

create policy "Users can upload spot photos"
on storage.objects for insert
with check (
  bucket_id = 'spot-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.account_can_interact(auth.uid())
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  and (metadata->>'mimetype' is null or lower(metadata->>'mimetype') in ('image/jpeg', 'image/jpg', 'image/png', 'image/webp'))
);

create policy "Users can read spot photos"
on storage.objects for select
using (bucket_id = 'spot-photos');

create policy "Users can delete own spot photos"
on storage.objects for delete
using (bucket_id = 'spot-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins can manage spot photo objects"
on storage.objects for all
using (bucket_id = 'spot-photos' and public.is_admin())
with check (bucket_id = 'spot-photos' and public.is_admin());

drop policy if exists "Users can upload own avatars" on storage.objects;
drop policy if exists "Users can update own avatars" on storage.objects;
drop policy if exists "Users can read avatars" on storage.objects;
drop policy if exists "Users can delete own avatars" on storage.objects;
drop policy if exists "Admins can manage avatar objects" on storage.objects;

create policy "Users can upload own avatars"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.account_can_interact(auth.uid())
  and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  and (metadata->>'mimetype' is null or lower(metadata->>'mimetype') in ('image/jpeg', 'image/jpg', 'image/png', 'image/webp'))
);

create policy "Users can update own avatars"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] and public.account_can_interact(auth.uid()))
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can delete own avatars"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Admins can manage avatar objects"
on storage.objects for all
using (bucket_id = 'avatars' and public.is_admin())
with check (bucket_id = 'avatars' and public.is_admin());

-- 7) Delete-account request. Full auth.users deletion still needs a server-side Edge Function/service-role job.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  admin_note text
);

alter table public.account_deletion_requests enable row level security;
create index if not exists account_deletion_requests_user_idx on public.account_deletion_requests(user_id, requested_at desc);

drop policy if exists "Users can read own deletion requests" on public.account_deletion_requests;
create policy "Users can read own deletion requests" on public.account_deletion_requests for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can update deletion requests" on public.account_deletion_requests;
create policy "Admins can update deletion requests" on public.account_deletion_requests for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.request_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_email text;
  suffix text;
begin
  if uid is null then
    raise exception 'Not authenticated.';
  end if;

  select email into current_email from public.profiles where id = uid;
  suffix := substr(replace(uid::text, '-', ''), 1, 8);

  insert into public.account_deletion_requests(user_id, email, status)
  values (uid, current_email, 'requested');

  perform set_config('app.allow_profile_security_update', 'true', true);

  update public.profiles
  set
    username = 'deleted_' || suffix,
    full_name = null,
    email = null,
    avatar_url = null,
    bio = null,
    city = null,
    neighborhood = null,
    favorite_slice = null,
    favorite_spot_id = null,
    pizza_style = null,
    dietary_notes = null,
    instagram_url = null,
    website_url = null,
    profile_visibility = 'private',
    allow_profile_messages = false,
    account_status = 'deleted',
    deletion_requested_at = now(),
    deleted_at = now(),
    updated_at = now()
  where id = uid;

  update public.spots set status = 'hidden', updated_at = now() where created_by = uid;
  update public.plans set status = 'cancelled', updated_at = now() where created_by = uid;
  update public.plan_members set status = 'left', updated_at = now() where user_id = uid;
  update public.messages set content = '[deleted account]', user_id = null where user_id = uid;
  update public.spot_comments set status = 'deleted', content = '[deleted]', updated_at = now() where user_id = uid;
  update public.spot_photos set status = 'deleted' where user_id = uid;
  update public.home_recipes set status = 'removed', updated_at = now() where user_id = uid;
  update public.home_recipe_comments set status = 'hidden', content = '[deleted]', updated_at = now() where user_id = uid;
  delete from public.profile_follows where follower_id = uid or following_id = uid;
  delete from public.saved_spots where user_id = uid;

  return true;
end;
$$;

grant execute on function public.request_account_deletion() to authenticated;

-- 10) Basic anti-spam / rate limiting at database level.
create or replace function public.enforce_basic_rate_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  actor_col text;
  max_count integer;
  window_size interval;
  current_count integer;
begin
  case tg_table_name
    when 'reports' then actor := new.reporter_id; actor_col := 'reporter_id'; max_count := 10; window_size := interval '1 hour';
    when 'spots' then actor := new.created_by; actor_col := 'created_by'; max_count := 10; window_size := interval '1 hour';
    when 'plans' then actor := new.created_by; actor_col := 'created_by'; max_count := 12; window_size := interval '1 hour';
    when 'messages' then actor := new.user_id; actor_col := 'user_id'; max_count := 40; window_size := interval '1 minute';
    when 'spot_comments' then actor := new.user_id; actor_col := 'user_id'; max_count := 25; window_size := interval '1 hour';
    when 'spot_photos' then actor := new.user_id; actor_col := 'user_id'; max_count := 20; window_size := interval '1 day';
    when 'home_recipes' then actor := new.user_id; actor_col := 'user_id'; max_count := 10; window_size := interval '1 day';
    when 'home_recipe_comments' then actor := new.user_id; actor_col := 'user_id'; max_count := 25; window_size := interval '1 hour';
    when 'check_ins' then actor := new.user_id; actor_col := 'user_id'; max_count := 40; window_size := interval '1 hour';
    when 'profile_follows' then actor := new.follower_id; actor_col := 'follower_id'; max_count := 80; window_size := interval '1 hour';
    else return new;
  end case;

  if actor is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if not public.account_can_interact(actor) then
    raise exception 'This account is not allowed to perform this action.';
  end if;

  execute format('select count(*) from public.%I where %I = $1 and created_at >= now() - $2', tg_table_name, actor_col)
  into current_count
  using actor, window_size;

  if current_count >= max_count then
    raise exception 'Rate limit exceeded. Please slow down and try again later.';
  end if;

  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['reports','spots','plans','messages','spot_comments','spot_photos','home_recipes','home_recipe_comments','check_ins','profile_follows'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists rate_limit_%I on public.%I', t, t);
      execute format('create trigger rate_limit_%I before insert on public.%I for each row execute function public.enforce_basic_rate_limits()', t, t);
    end if;
  end loop;
end $$;

-- Helpful indexes for rate limit checks.
create index if not exists reports_reporter_created_idx on public.reports(reporter_id, created_at desc);
create index if not exists messages_user_created_idx on public.messages(user_id, created_at desc);
create index if not exists home_recipe_comments_user_created_idx on public.home_recipe_comments(user_id, created_at desc);

-- Quick verification queries to run manually if needed:
-- select public.is_admin();
-- select public.account_can_interact(auth.uid());
