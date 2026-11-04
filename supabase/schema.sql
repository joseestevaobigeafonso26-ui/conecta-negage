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
