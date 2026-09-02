-- Fase 1: isolamento dos dados por professor (uma licença = um usuário).
--
-- Execute UMA VEZ no SQL Editor do Supabase, em uma janela de manutenção.
-- Esta migração substitui as políticas RLS atuais das tabelas do app.
-- Não execute o antigo transaction_rls.sql: esta migração já protege a tabela
-- transaction junto com os demais dados.
--
-- IMPORTANTE: se já houver dados, substitua o valor abaixo pelo e-mail da sua
-- conta de professor no Supabase Auth, antes de executar este script.

begin;

-- As tabelas existentes passam a pertencer ao usuário do Supabase que as criou.
do $$
declare
  table_name text;
  legacy_user_id uuid;
  legacy_owner_email text := 'robsonsvicero@outlook.com';
  has_existing_data boolean := false;
  table_has_existing_data boolean;
  protected_tables text[] := array[
    'app_settings', 'student', 'lesson', 'transaction', 'receipt',
    'client', 'quote', 'company_settings', 'service_order', 'budget'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass('public.' || table_name) is not null then
      execute format(
        'alter table public.%I add column if not exists user_id uuid references auth.users(id) on delete restrict',
        table_name
      );
      execute format('create index if not exists %I on public.%I (user_id)', table_name || '_user_id_idx', table_name);
      execute format('select exists (select 1 from public.%I)', table_name) into table_has_existing_data;
      -- Não interrompa o loop: todas as tabelas precisam receber a coluna
      -- user_id antes de os registros existentes serem atualizados.
      has_existing_data := has_existing_data or table_has_existing_data;
    end if;
  end loop;

  -- Os dados atuais pertencem ao professor informado acima. Forçar a indicação
  -- explícita evita atribuir registros ao usuário incorreto por acidente.
  if has_existing_data then
    if legacy_owner_email = 'SUBSTITUA-PELO-EMAIL-DO-PROFESSOR' then
      raise exception 'Substitua legacy_owner_email pelo e-mail do professor antes de executar esta migração.';
    end if;

    select id into legacy_user_id
    from auth.users
    where lower(email) = lower(trim(legacy_owner_email));

    if legacy_user_id is null then
      raise exception 'O usuário % não foi encontrado em auth.users. Confirme o e-mail do professor.', legacy_owner_email;
    end if;
  end if;

  foreach table_name in array protected_tables loop
    if to_regclass('public.' || table_name) is not null then
      if legacy_user_id is not null then
        execute format('update public.%I set user_id = $1 where user_id is null', table_name)
          using legacy_user_id;
      end if;
      execute format('alter table public.%I alter column user_id set not null', table_name);
    end if;
  end loop;
end;
$$;

-- O app não envia user_id pelo navegador. Este trigger associa cada novo
-- registro ao usuário autenticado e impede a troca de proprietário em updates.
create or replace function public.assign_current_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    return new;
  end if;

  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if new.user_id is null then
    raise exception 'Usuário autenticado obrigatório para criar dados.';
  end if;

  return new;
end;
$$;

-- Cria o trigger de propriedade em todas as tabelas que existirem no projeto.
do $$
declare
  table_name text;
  protected_tables text[] := array[
    'app_settings', 'student', 'lesson', 'transaction', 'receipt',
    'client', 'quote', 'company_settings', 'service_order', 'budget'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop trigger if exists assign_current_user_id on public.%I', table_name);
      execute format(
        'create trigger assign_current_user_id before insert or update on public.%I for each row execute function public.assign_current_user_id()',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Remove políticas anteriores e cria regras estritas por proprietário.
do $$
declare
  table_name text;
  policy_record record;
  protected_tables text[] := array[
    'app_settings', 'student', 'lesson', 'transaction', 'receipt',
    'client', 'quote', 'company_settings', 'service_order', 'budget'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass('public.' || table_name) is not null then
      for policy_record in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, table_name);
      end loop;

      execute format('alter table public.%I enable row level security', table_name);
      execute format('create policy user_data_select on public.%I for select to authenticated using (user_id = auth.uid())', table_name);
      execute format('create policy user_data_insert on public.%I for insert to authenticated with check (user_id = auth.uid())', table_name);
      execute format('create policy user_data_update on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name);
      execute format('create policy user_data_delete on public.%I for delete to authenticated using (user_id = auth.uid())', table_name);
    end if;
  end loop;
end;
$$;

-- Perfis são dados pessoais: cada professor lê apenas o próprio perfil.
alter table public.profiles enable row level security;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end;
$$;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

revoke execute on function public.assign_current_user_id() from public;
grant execute on function public.assign_current_user_id() to authenticated;

commit;
