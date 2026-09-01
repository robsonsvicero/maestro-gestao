-- Permite que usuários autenticados do app consultem e gerenciem transações.
-- Execute este arquivo uma vez no SQL Editor do projeto Supabase de produção.
--
-- Observação: o schema atual não possui uma coluna de proprietário na tabela
-- transaction; por isso, os usuários autenticados compartilham os lançamentos.

alter table public.transaction enable row level security;

drop policy if exists "Authenticated users can manage transactions" on public.transaction;

create policy "Authenticated users can manage transactions"
on public.transaction
for all
to authenticated
using (true)
with check (true);
