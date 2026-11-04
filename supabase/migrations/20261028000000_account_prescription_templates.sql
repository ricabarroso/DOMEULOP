create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  disease text not null check (length(trim(disease)) between 1 and 120),
  prescription_type text not null check (prescription_type in ('standard', 'compounded')),
  medications jsonb not null default '[]'::jsonb,
  compounding_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists prescription_templates_user_disease_key
  on public.prescription_templates (user_id, lower(disease));

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'ricardobarroso.med@gmail.com',
    'ricardo-barroso@hotmail.com',
    'rica_bol@hotmail.com'
  );
$$;

create or replace function public.is_app_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_app_admin()
    or exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and approved
    );
$$;

create or replace function public.create_app_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, approved)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    lower(coalesce(new.email, '')) in (
      'ricardobarroso.med@gmail.com',
      'ricardo-barroso@hotmail.com',
      'rica_bol@hotmail.com'
    )
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_app_profile();

insert into public.profiles (id, email, approved)
select
  id,
  lower(coalesce(email, '')),
  lower(coalesce(email, '')) in (
    'ricardobarroso.med@gmail.com',
    'ricardo-barroso@hotmail.com',
    'rica_bol@hotmail.com'
  )
from auth.users
on conflict (id) do update
  set email = excluded.email,
      approved = profiles.approved or excluded.approved;

create or replace function public.approve_app_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas os administradores autorizados podem aprovar cadastros.';
  end if;

  update public.profiles
  set approved = true
  where id = target_user_id;

  if not found then
    raise exception 'Cadastro não encontrado.';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.prescription_templates enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_app_admin()));

drop policy if exists "templates_read_authorized_owner" on public.prescription_templates;
create policy "templates_read_authorized_owner"
  on public.prescription_templates for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()));

drop policy if exists "templates_insert_authorized_owner" on public.prescription_templates;
create policy "templates_insert_authorized_owner"
  on public.prescription_templates for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

drop policy if exists "templates_update_authorized_owner" on public.prescription_templates;
create policy "templates_update_authorized_owner"
  on public.prescription_templates for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()))
  with check (user_id = (select auth.uid()) and (select public.is_app_authorized()));

drop policy if exists "templates_delete_authorized_owner" on public.prescription_templates;
create policy "templates_delete_authorized_owner"
  on public.prescription_templates for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_app_authorized()));

revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.is_app_authorized() from public, anon;
revoke all on function public.create_app_profile() from public, anon, authenticated;
revoke all on function public.approve_app_user(uuid) from public, anon;
revoke all on public.profiles, public.prescription_templates from public, anon;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_app_authorized() to authenticated;
grant execute on function public.approve_app_user(uuid) to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.prescription_templates to authenticated;
