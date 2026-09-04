-- Migra o nome da escola para o nome do profissional autonomo.
-- Execute este script antes de publicar a versao do frontend que usa professional_name.

alter table public.app_settings
  add column if not exists professional_name text;

update public.app_settings
set professional_name = coalesce(nullif(professional_name, ''), school_name, 'Nome do profissional')
where professional_name is null or professional_name = '';

alter table public.app_settings
  alter column professional_name set default 'Nome do profissional',
  alter column professional_name set not null;

alter table public.app_settings
  drop column if exists school_name;
