-- 1. Tabela de Entitlements
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  access_type text not null check (access_type in ('subscription', 'trial', 'lifetime')),
  provider text not null check (provider in ('google_play', 'internal')),
  product_id text,
  base_plan_id text,
  purchase_token text unique,
  status text not null check (status in ('pending', 'active', 'grace_period', 'on_hold', 'canceled', 'expired', 'revoked')),
  access_starts_at timestamptz not null default now(),
  access_ends_at timestamptz,
  auto_renewing boolean default false,
  canceled_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Histórico de Eventos de Assinatura
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  event_type text not null,
  purchase_token text,
  product_id text,
  base_plan_id text,
  message_id text unique, -- Para idempotência do RTDN
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed')),
  processing_error text,
  created_at timestamptz not null default now()
);

-- 3. Índices para performance
create index if not exists entitlements_auth_user_id_idx on public.entitlements(auth_user_id);
create index if not exists entitlements_purchase_token_idx on public.entitlements(purchase_token);
create index if not exists subscription_events_purchase_token_idx on public.subscription_events(purchase_token);

-- 4. RLS (Row Level Security)
alter table public.entitlements enable row level security;
alter table public.subscription_events enable row level security;

-- O usuário só pode consultar seus próprios entitlements
create policy entitlements_select_own on public.entitlements
  for select to authenticated
  using (auth_user_id = auth.uid());

-- O frontend não pode inserir/alterar/deletar entitlements (apenas Edge Functions com service_role podem)

-- 5. Migração de Trials (de billing_trials para entitlements)
insert into public.entitlements (
  auth_user_id,
  email,
  access_type,
  provider,
  status,
  access_starts_at,
  access_ends_at
)
select 
  auth_user_id,
  email,
  'trial' as access_type,
  'internal' as provider,
  case 
    when ends_at > now() then 'active'
    else 'expired'
  end as status,
  starts_at as access_starts_at,
  ends_at as access_ends_at
from public.billing_trials
on conflict do nothing;
