-- Modalidade de cobrança dos alunos.
-- Alunos existentes permanecem no fluxo mensal.
alter table public.student
  add column if not exists payment_type text not null default 'monthly'
    check (payment_type in ('monthly', 'weekly'));

alter table public.student
  add column if not exists weekly_payment numeric(12,2) default 0;

comment on column public.student.payment_type is 'monthly para mensalidade ou weekly para cobrança por aula/semana';
comment on column public.student.weekly_payment is 'Valor cobrado por aula no ciclo semanal';
