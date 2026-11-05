create table if not exists public.saved_professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_key text not null check (length(entry_key) between 1 and 200),
  nome text not null check (length(trim(nome)) between 1 and 200),
  crm text not null default '' check (length(crm) <= 40),
  cidade_estado text not null default '' check (length(cidade_estado) <= 120),
  documento_tipo text not null default '' check (documento_tipo in ('', 'CNS', 'CPF')),
  documento_numero text not null default '' check (length(documento_numero) <= 20),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_key)
);

create table if not exists public.saved_institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_key text not null check (length(entry_key) between 1 and 40),
  nome text not null check (length(trim(nome)) between 1 and 300),
  cnes text not null default '' check (length(cnes) <= 20),
  endereco text not null default '' check (length(endereco) <= 400),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_key)
);

alter table public.saved_professionals enable row level security;
alter table public.saved_institutions enable row level security;

drop policy if exists "saved_professionals_owner" on public.saved_professionals;
create policy "saved_professionals_owner"
  on public.saved_professionals for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()))
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

drop policy if exists "saved_institutions_owner" on public.saved_institutions;
create policy "saved_institutions_owner"
  on public.saved_institutions for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()))
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

revoke all on public.saved_professionals, public.saved_institutions from public, anon;
grant select, insert, update, delete on public.saved_professionals, public.saved_institutions to authenticated;
