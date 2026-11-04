-- CORRECÇÃO: "infinite recursion detected in policy" (login que volta à página inicial).
-- Executar DEPOIS de migration_3.sql. As regras passam a usar funções que não reentram nas regras de outras tabelas.

create or replace function owns_company(cid uuid) returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from companies where id = cid and owner_id = auth.uid()) $$;

create or replace function owns_job(jid uuid) returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from jobs j join companies c on c.id = j.company_id where j.id = jid and c.owner_id = auth.uid()) $$;

create or replace function has_applied(jid uuid) returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from applications where job_id = jid and candidate_id = auth.uid()) $$;

create or replace function employer_sees(cand uuid) returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id
                     where a.candidate_id = cand and c.owner_id = auth.uid()) $$;

drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (id = auth.uid() or is_admin() or employer_sees(id));

drop policy if exists cand_read on candidates;
create policy cand_read on candidates for select using (id = auth.uid() or is_admin() or employer_sees(id));

drop policy if exists jobs_read on jobs;
create policy jobs_read on jobs for select using (
  (status = 'open' and exists (select 1 from companies c where c.id = company_id and c.status = 'approved'))
  or owns_company(company_id) or has_applied(id) or is_admin());

drop policy if exists jobs_update on jobs;
create policy jobs_update on jobs for update using (owns_company(company_id));

drop policy if exists app_comp_read on applications;
create policy app_comp_read on applications for select using (owns_job(job_id));

drop policy if exists app_comp_update on applications;
create policy app_comp_update on applications for update using (owns_job(job_id));

-- O SQL Editor e o servidor (sem utilizador autenticado) podem alterar o estado; os utilizadores normais não.
create or replace function guard_company() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not is_admin() and (new.status is distinct from old.status or new.owner_id <> old.owner_id) then
    raise exception 'Campos protegidos';
  end if;
  return new;
end $$;
