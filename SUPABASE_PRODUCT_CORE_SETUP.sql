-- Pizzapolis product tables: saved spots, moderation reports and admin audit.
-- Run after SUPABASE_AUTH_PROFILES_SETUP.sql and SUPABASE_PROFILE_EXTENSIONS.sql.

create table if not exists public.saved_spots (
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id uuid,
  reason text,
  details text,
  status text not null default 'open',
  admin_note text,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports
  add column if not exists reporter_id uuid references auth.users(id) on delete set null,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists reason text,
  add column if not exists details text,
  add column if not exists status text not null default 'open',
  add column if not exists admin_note text,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

update public.reports set entity_type = 'spot' where entity_type is null;
update public.reports set reason = 'legacy_report' where reason is null;
update public.reports set status = 'open' where status is null;

alter table public.reports
  alter column entity_type set not null,
  alter column reason set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_entity_type_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_entity_type_check
      check (entity_type in ('spot', 'comment', 'photo', 'plan', 'profile'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_status_check'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_status_check
      check (status in ('open', 'reviewing', 'resolved', 'dismissed'));
  end if;
end $$;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_spots_user_idx on public.saved_spots(user_id, created_at desc);
create index if not exists saved_spots_spot_idx on public.saved_spots(spot_id);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists reports_entity_idx on public.reports(entity_type, entity_id);
create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs(admin_id, created_at desc);

alter table public.saved_spots enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Users can read own saved spots" on public.saved_spots;
create policy "Users can read own saved spots"
on public.saved_spots for select
using (auth.uid() = user_id);

drop policy if exists "Users can save own spots" on public.saved_spots;
create policy "Users can save own spots"
on public.saved_spots for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved spots" on public.saved_spots;
create policy "Users can delete own saved spots"
on public.saved_spots for delete
using (auth.uid() = user_id);

drop policy if exists "Signed in users can create reports" on public.reports;
create policy "Signed in users can create reports"
on public.reports for insert
with check (auth.uid() = reporter_id or reporter_id is null);

drop policy if exists "Reporters can read own reports" on public.reports;
create policy "Reporters can read own reports"
on public.reports for select
using (auth.uid() = reporter_id);

-- Keep full report/admin visibility limited to service role or your own admin policies.
-- Example: create an is_admin boolean on profiles and add admin select/update policies when ready.
