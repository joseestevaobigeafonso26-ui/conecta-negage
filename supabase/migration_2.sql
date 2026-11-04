-- Executar DEPOIS de schema.sql. Perfil da empresa, etiquetas das vagas e estatísticas públicas reais.
alter table companies add column if not exists description text;
alter table companies add column if not exists address text;
alter table jobs add column if not exists tags text[] default '{}';

-- A empresa pode editar o seu perfil, mas nunca o estado de aprovação nem o dono.
create function guard_company() returns trigger language plpgsql as $$
begin
  if not is_admin() and (new.status is distinct from old.status or new.owner_id <> old.owner_id) then
    raise exception 'Campos protegidos';
  end if;
  return new;
end $$;
create trigger company_guard before update on companies for each row execute function guard_company();
create policy comp_owner_update on companies for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Números reais para a página inicial (visíveis a qualquer visitante, sem expor dados pessoais)
create function public_stats() returns json language sql security definer stable set search_path = public as $$
  select json_build_object(
    'jobs', (select count(*) from jobs j join companies c on c.id = j.company_id where j.status = 'open' and c.status = 'approved'),
    'candidates', (select count(*) from candidates c join profiles p on p.id = c.id where p.role = 'candidate'),
    'companies', (select count(*) from companies where status = 'approved'),
    'hired', (select count(*) from applications where status = 'hired'))
$$;
grant execute on function public_stats() to anon, authenticated;
