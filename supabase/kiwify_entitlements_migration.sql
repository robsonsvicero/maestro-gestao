-- Execute este script uma vez no SQL Editor do Supabase antes de publicar
-- a nova Edge Function kiwify-webhook.
-- Ele preserva a estrutura usada pelo Google Play e adiciona a Kiwify como
-- outro provedor de acesso.

alter table public.entitlements
  add column if not exists provider_reference text;

alter table public.entitlements
  drop constraint if exists entitlements_provider_check;

alter table public.entitlements
  add constraint entitlements_provider_check
  check (provider in ('google_play', 'kiwify', 'internal'));

create unique index if not exists entitlements_provider_reference_key
  on public.entitlements(provider, provider_reference)
  where provider_reference is not null;
