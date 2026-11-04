-- 1) Só se pode candidatar quem tem área de estudo e currículo no perfil.
create or replace function profile_complete() returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from candidates where id = auth.uid() and cv_path is not null and coalesce(area,'') <> '') $$;

drop policy if exists app_cand_insert on applications;
create policy app_cand_insert on applications for insert with check (
  candidate_id = auth.uid() and profile_complete()
  and exists (select 1 from jobs j where j.id = job_id and j.status = 'open'));

-- 2) Avisos para empresas e administradores.
create or replace function notify_company() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, title, body)
      select id, 'Nova empresa para aprovar', 'A empresa "'||new.name||'" registou-se e aguarda aprovação.' from profiles where role = 'admin';
  elsif new.status is distinct from old.status then
    insert into notifications (user_id, title, body) values (new.owner_id,
      case new.status when 'approved' then 'Empresa aprovada' when 'suspended' then 'Empresa suspensa' else 'Estado actualizado' end,
      case new.status when 'approved' then 'A sua empresa foi aprovada. Já pode publicar vagas.'
                      when 'suspended' then 'A sua empresa foi suspensa. Contacte o suporte.' else 'O estado da sua empresa mudou.' end);
  end if;
  return new;
end $$;
drop trigger if exists company_notify on companies;
create trigger company_notify after insert or update on companies for each row execute function notify_company();
