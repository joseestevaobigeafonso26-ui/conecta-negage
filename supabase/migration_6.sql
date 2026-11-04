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
