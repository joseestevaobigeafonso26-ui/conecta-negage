# Conecta Negage (Next.js + Supabase)

1. Crie um projecto em supabase.com. No SQL Editor execute UM só ficheiro: `supabase/setup_completo.sql`
   (apaga e recria as tabelas da plataforma; use-o só numa instalação nova).
2. Authentication > Sign In / Providers: ligue "Allow new users to sign up" e, em Email, para testar,
   desligue "Confirm email".
3. Authentication > URL Configuration: em "Site URL" ponha `http://localhost:3000` e em "Redirect URLs"
   acrescente `http://localhost:3000/**` (necessário para a recuperação de palavra-passe).
   Em produção, acrescente também o endereço público do site.
4. Copie `.env.example` para `.env.local` e preencha URL, chave anon e chave service_role
   (Project Settings > API; a service_role nunca deve ir para o browser nem para o Git).
5. `npm install && npm run dev`
6. Crie o administrador em Authentication > Users > Add user (marque "Auto Confirm User") e promova-o:
   insert into profiles (id, role, full_name, email)
   select id, 'admin', 'Administrador', email from auth.users where email = 'SEU@EMAIL'
   on conflict (id) do update set role = 'admin';

Notas
- A recuperação de palavra-passe envia e-mail. O envio embutido do Supabase tem limite muito baixo;
  para uso real configure um SMTP próprio em Authentication > Emails > SMTP Settings.
- Para candidatar-se, o candidato precisa de área de estudo e currículo (PDF) no perfil.
- Cada candidatura tem uma conversa (candidato <-> empresa) em /conversa/<id>. Só os dois participantes a leem;
  nem o administrador tem acesso por omissão. Limite: 10 mensagens por minuto por pessoa.
- Termos de Uso e Política de Privacidade (/termos, /privacidade) são RASCUNHOS: peça revisão jurídica antes de lançar.
- Defina NEXT_PUBLIC_SITE_URL em produção para os links de partilha e de recuperação de palavra-passe.
