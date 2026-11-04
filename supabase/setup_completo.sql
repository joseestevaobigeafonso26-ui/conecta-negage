-- ============================================================================
-- CONECTA NEGAGE — instalação completa (substitui schema + migration_2/3/4).
-- ATENÇÃO: apaga as tabelas da plataforma e TODOS os dados nelas. Pode ser executado várias vezes.
-- Não apaga os utilizadores de Authentication; apaga só perfis, vagas, candidaturas, etc.
-- ============================================================================

-- 0. LIMPEZA
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists messages, notifications, applications, jobs, companies, candidates, profiles cascade;
drop function if exists handle_new_user() cascade;
drop function if exists notify_application() cascade;
drop function if exists lock_application_fields() cascade;
drop function if exists guard_company() cascade;
drop function if exists notify_message() cascade;
drop function if exists msg_rate_limit() cascade;
drop function if exists can_chat(uuid) cascade;
drop function if exists notify_company() cascade;
drop function if exists profile_complete() cascade;
drop function if exists public_stats() cascade;
drop function if exists employer_sees(uuid) cascade;
drop function if exists has_applied(uuid) cascade;
drop function if exists owns_job(uuid) cascade;
drop function if exists owns_company(uuid) cascade;
drop function if exists my_role() cascade;
drop function if exists is_admin() cascade;
drop policy if exists cv_write on storage.objects;
drop policy if exists cv_update on storage.objects;
drop policy if exists cv_read on storage.objects;


-- 1. ESQUEMA BASE
-- Conecta Negage — esquema Supabase. Cole no SQL Editor e execute uma vez.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('candidate','company','admin')),
  full_name text not null default '',
  phone text,
  created_at timestamptz default now()
);
create table candidates (
  id uuid primary key references profiles(id) on delete cascade,
  area text, education text, cv_path text
);
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null, sector text, phone text,
  status text not null default 'pending' check (status in ('pending','approved','suspended')),
  created_at timestamptz default now()
);
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null, category text, type text, location text default 'Negage', salary text,
  description text, requirements text[] default '{}', benefits text[] default '{}',
  status text not null default 'open' check (status in ('open','closed','hidden')),
  created_at timestamptz default now()
);
create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  message text,
  status text not null default 'submitted' check (status in ('submitted','in_review','interview','hired','rejected')),
  interview_at timestamptz, note text,
  created_at timestamptz default now(),
  unique (job_id, candidate_id)
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null, body text, read boolean default false,
  created_at timestamptz default now()
);

-- Funções auxiliares (security definer evita recursão nas políticas)
create function is_admin() returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;
create function my_role() returns text language sql security definer stable set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

-- Novo utilizador -> perfil (nunca admin por registo) + candidato ou empresa (pendente)
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','candidate');
begin
  if r not in ('candidate','company') then r := 'candidate'; end if;
  insert into profiles (id, role, full_name, phone)
    values (new.id, r, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  if r = 'candidate' then insert into candidates (id) values (new.id);
  else insert into companies (owner_id, name, sector, phone)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'company_name',''),'Empresa'), new.raw_user_meta_data->>'sector', new.raw_user_meta_data->>'phone');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Notificações automáticas (candidatura nova / mudança de estado)
create function notify_application() returns trigger language plpgsql security definer set search_path = public as $$
declare jt text; owner uuid; cname text; txt text;
begin
  select j.title, c.owner_id, c.name into jt, owner, cname
    from jobs j join companies c on c.id = j.company_id where j.id = new.job_id;
  if tg_op = 'INSERT' then
    insert into notifications (user_id, title, body) values
      (new.candidate_id, 'Candidatura enviada', 'A sua candidatura a "'||jt||'" ('||cname||') foi entregue com sucesso.'),
      (owner, 'Nova candidatura', 'Recebeu uma candidatura para "'||jt||'".');
  elsif new.status is distinct from old.status then
    txt := case new.status when 'in_review' then 'está em análise.'
      when 'interview' then 'foi marcada entrevista'||coalesce(' para '||to_char(new.interview_at,'DD/MM/YYYY HH24:MI'),'')||'.'
      when 'hired' then 'foi seleccionado(a). Parabéns!' else 'não foi seleccionada desta vez.' end;
    insert into notifications (user_id, title, body)
      values (new.candidate_id, 'Actualização da candidatura', '"'||jt||'" ('||cname||'): '||txt);
  end if;
  return new;
end $$;
create trigger app_notify after insert or update on applications for each row execute function notify_application();

create function lock_application_fields() returns trigger language plpgsql as $$
begin
  if new.job_id <> old.job_id or new.candidate_id <> old.candidate_id then raise exception 'Campos protegidos'; end if;
  return new;
end $$;
create trigger app_lock before update on applications for each row execute function lock_application_fields();

-- RLS
alter table profiles enable row level security;
alter table candidates enable row level security;
alter table companies enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table notifications enable row level security;

create policy profiles_read on profiles for select using (
  id = auth.uid() or is_admin() or exists (
    select 1 from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id
    where a.candidate_id = profiles.id and c.owner_id = auth.uid()));
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = my_role());
create policy profiles_admin on profiles for all using (is_admin());

create policy cand_read on candidates for select using (
  id = auth.uid() or is_admin() or exists (
    select 1 from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id
    where a.candidate_id = candidates.id and c.owner_id = auth.uid()));
create policy cand_update on candidates for update using (id = auth.uid());

create policy comp_read on companies for select using (status = 'approved' or owner_id = auth.uid() or is_admin());
create policy comp_admin on companies for all using (is_admin());   -- só o admin aprova/suspende

create policy jobs_read on jobs for select using (
  (status = 'open' and exists (select 1 from companies c where c.id = company_id and c.status = 'approved'))
  or exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  or exists (select 1 from applications a where a.job_id = jobs.id and a.candidate_id = auth.uid())
  or is_admin());
create policy jobs_insert on jobs for insert with check (
  exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid() and c.status = 'approved'));
create policy jobs_update on jobs for update using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy jobs_admin on jobs for all using (is_admin());

create policy app_cand_read on applications for select using (candidate_id = auth.uid());
create policy app_cand_insert on applications for insert with check (
  candidate_id = auth.uid() and exists (select 1 from jobs j where j.id = job_id and j.status = 'open'));
create policy app_comp_read on applications for select using (
  exists (select 1 from jobs j join companies c on c.id = j.company_id where j.id = job_id and c.owner_id = auth.uid()));
create policy app_comp_update on applications for update using (
  exists (select 1 from jobs j join companies c on c.id = j.company_id where j.id = job_id and c.owner_id = auth.uid()));
create policy app_admin on applications for all using (is_admin());

create policy notif_read on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid());

-- Storage: currículos privados. Candidato escreve na sua pasta; empresa lê só de quem se candidatou.
insert into storage.buckets (id, name, public) values ('cvs','cvs',false) on conflict do nothing;
create policy cv_write on storage.objects for insert with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cv_update on storage.objects for update using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cv_read on storage.objects for select using (
  bucket_id = 'cvs' and (
    (storage.foldername(name))[1] = auth.uid()::text or is_admin() or exists (
      select 1 from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id
      where c.owner_id = auth.uid() and a.candidate_id::text = (storage.foldername(name))[1])));

-- Primeiro administrador: registe-se na app e depois execute:
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'SEU@EMAIL');

-- 2. PERFIL DA EMPRESA, ETIQUETAS, ESTATÍSTICAS
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

-- 3. E-MAIL NO PERFIL
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

-- 4. REGRAS DE SEGURANÇA SEM RECURSÃO
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

-- 5. CANDIDATURA EXIGE PERFIL COMPLETO + AVISOS DE EMPRESAS
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

-- 6. MENSAGENS POR CANDIDATURA
-- Mensagens dentro de cada candidatura (candidato <-> empresa). Pode ser executado mais de uma vez.
alter table notifications add column if not exists link text;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz default now()
);
create index if not exists messages_app_idx on messages (application_id, created_at);
alter table messages enable row level security;

-- Só participam o candidato da candidatura e o dono da empresa da vaga.
create or replace function can_chat(app uuid) returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id
                     where a.id = app and (a.candidate_id = auth.uid() or c.owner_id = auth.uid())) $$;

drop policy if exists msg_read on messages;
create policy msg_read on messages for select using (can_chat(application_id));
drop policy if exists msg_insert on messages;
create policy msg_insert on messages for insert with check (sender_id = auth.uid() and can_chat(application_id));

-- Limite anti-spam: no máximo 10 mensagens por minuto por utilizador.
create or replace function msg_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'Está a enviar mensagens depressa demais. Aguarde um momento.';
  end if;
  return new;
end $$;
drop trigger if exists msg_rate on messages;
create trigger msg_rate before insert on messages for each row execute function msg_rate_limit();

-- Aviso à outra pessoa
create or replace function notify_message() returns trigger language plpgsql security definer set search_path = public as $$
declare cand uuid; owner uuid; jt text; cname text; sname text; target uuid;
begin
  select a.candidate_id, c.owner_id, j.title, c.name into cand, owner, jt, cname
    from applications a join jobs j on j.id = a.job_id join companies c on c.id = j.company_id where a.id = new.application_id;
  sname := case when new.sender_id = owner then cname else (select full_name from profiles where id = new.sender_id) end;
  target := case when new.sender_id = cand then owner else cand end;
  insert into notifications (user_id, title, body, link)
    values (target, 'Nova mensagem', coalesce(nullif(sname,''),'Alguém')||' enviou uma mensagem sobre "'||jt||'".', '/conversa/'||new.application_id);
  return new;
end $$;
drop trigger if exists msg_notify on messages;
create trigger msg_notify after insert on messages for each row execute function notify_message();

-- Os avisos de candidaturas e empresas passam a ter ligação directa.
create or replace function notify_application() returns trigger language plpgsql security definer set search_path = public as $$
declare jt text; owner uuid; cname text; txt text;
begin
  select j.title, c.owner_id, c.name into jt, owner, cname
    from jobs j join companies c on c.id = j.company_id where j.id = new.job_id;
  if tg_op = 'INSERT' then
    insert into notifications (user_id, title, body, link) values
      (new.candidate_id, 'Candidatura enviada', 'A sua candidatura a "'||jt||'" ('||cname||') foi entregue com sucesso.', '/candidato'),
      (owner, 'Nova candidatura', 'Recebeu uma candidatura para "'||jt||'".', '/conversa/'||new.id);
  elsif new.status is distinct from old.status then
    txt := case new.status when 'in_review' then 'está em análise.'
      when 'interview' then 'foi marcada entrevista'||coalesce(' para '||to_char(new.interview_at,'DD/MM/YYYY HH24:MI'),'')||'.'
      when 'hired' then 'foi seleccionado(a). Parabéns!' else 'não foi seleccionada desta vez.' end;
    insert into notifications (user_id, title, body, link)
      values (new.candidate_id, 'Actualização da candidatura', '"'||jt||'" ('||cname||'): '||txt, '/conversa/'||new.id);
  end if;
  return new;
end $$;

create or replace function notify_company() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, title, body, link)
      select id, 'Nova empresa para aprovar', 'A empresa "'||new.name||'" registou-se e aguarda aprovação.', '/admin' from profiles where role = 'admin';
  elsif new.status is distinct from old.status then
    insert into notifications (user_id, title, body, link) values (new.owner_id,
      case new.status when 'approved' then 'Empresa aprovada' when 'suspended' then 'Empresa suspensa' else 'Estado actualizado' end,
      case new.status when 'approved' then 'A sua empresa foi aprovada. Já pode publicar vagas.'
                      when 'suspended' then 'A sua empresa foi suspensa. Contacte o suporte.' else 'O estado da sua empresa mudou.' end,
      '/empresa');
  end if;
  return new;
end $$;

-- 7. RETIRAR CANDIDATURA
-- O candidato pode retirar a candidatura enquanto estiver "Recebida" ou "Em análise". Pode ser repetido.
drop policy if exists app_cand_delete on applications;
create policy app_cand_delete on applications for delete using (candidate_id = auth.uid() and status in ('submitted','in_review'));
