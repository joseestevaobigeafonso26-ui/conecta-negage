-- Executar DEPOIS de migration_2.sql. Passa a guardar o e-mail no perfil e o telefone passa a ser opcional.
alter table profiles add column if not exists email text;
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','candidate');
begin
  if r not in ('candidate','company') then r := 'candidate'; end if;
  insert into profiles (id, role, full_name, phone, email)
    values (new.id, r, coalesce(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''), new.email);
  if r = 'candidate' then insert into candidates (id) values (new.id);
  else insert into companies (owner_id, name, sector, phone)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'company_name',''),'Empresa'), new.raw_user_meta_data->>'sector', nullif(new.raw_user_meta_data->>'phone',''));
  end if;
  return new;
end $$;
