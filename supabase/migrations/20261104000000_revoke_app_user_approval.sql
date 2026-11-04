create or replace function public.revoke_app_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Apenas os administradores autorizados podem revogar acessos.';
  end if;

  update public.profiles
  set approved = false
  where id = target_user_id
    and lower(email) not in (
      'ricardobarroso.med@gmail.com',
      'ricardo-barroso@hotmail.com',
      'rica_bol@hotmail.com'
    );

  if not found then
    raise exception 'Cadastro não encontrado ou não pode ter o acesso revogado.';
  end if;
end;
$$;

revoke all on function public.revoke_app_user(uuid) from public, anon;
grant execute on function public.revoke_app_user(uuid) to authenticated;
