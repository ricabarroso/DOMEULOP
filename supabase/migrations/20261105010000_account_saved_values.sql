create table if not exists public.saved_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  field_key text not null check (length(field_key) between 1 and 60),
  value_key text not null check (length(value_key) between 1 and 500),
  value text not null check (length(trim(value)) between 1 and 500),
  detail text not null default '' check (length(detail) <= 2000),
  updated_at timestamptz not null default now(),
  unique (user_id, field_key, value_key)
);

create table if not exists public.saved_patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_key text not null check (length(entry_key) between 1 and 300),
  nome text not null check (length(trim(nome)) between 1 and 200),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 6000),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_key)
);

alter table public.saved_values enable row level security;
alter table public.saved_patients enable row level security;

drop policy if exists "saved_values_owner" on public.saved_values;
create policy "saved_values_owner"
  on public.saved_values for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()))
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

drop policy if exists "saved_patients_owner" on public.saved_patients;
create policy "saved_patients_owner"
  on public.saved_patients for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()))
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

revoke all on public.saved_values, public.saved_patients from public, anon;
grant select, insert, update, delete on public.saved_values, public.saved_patients to authenticated;
