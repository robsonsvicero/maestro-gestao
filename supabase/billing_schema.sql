-- Fase 2: estrutura comercial para licenças vendidas pela Kiwify.
-- Execute uma única vez no SQL Editor do Supabase antes de publicar o webhook.

create extension if not exists pgcrypto;

create table if not exists public.billing_products (
  id uuid primary key default gen_random_uuid(),
  kiwify_product_id text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  kiwify_order_id text not null unique,
  customer_id uuid not null references public.billing_customers(id),
  product_id uuid not null references public.billing_products(id),
  status text not null,
  amount numeric(12,2),
  currency text not null default 'BRL',
  raw_data jsonb not null default '{}'::jsonb,
  purchased_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  kiwify_subscription_id text not null unique,
  customer_id uuid not null references public.billing_customers(id),
  product_id uuid not null references public.billing_products(id),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  last_event_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.billing_customers(id) on delete cascade,
  product_id uuid not null references public.billing_products(id),
  subscription_id uuid references public.billing_subscriptions(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked')),
  access_starts_at timestamptz not null default now(),
  access_ends_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_hash text not null unique,
  event_type text not null,
  external_event_id text,
  kiwify_order_id text,
  kiwify_product_id text,
  payload jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'failed')),
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists billing_orders_customer_id_idx on public.billing_orders(customer_id);
create index if not exists billing_subscriptions_customer_id_idx on public.billing_subscriptions(customer_id);
create index if not exists billing_entitlements_customer_id_idx on public.billing_entitlements(customer_id);
create unique index if not exists billing_entitlements_customer_product_key
  on public.billing_entitlements(customer_id, product_id);
create index if not exists billing_webhook_events_status_idx on public.billing_webhook_events(processing_status, received_at desc);

alter table public.billing_products enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_entitlements enable row level security;
alter table public.billing_webhook_events enable row level security;

-- O professor pode apenas consultar a própria licença; alterações ocorrem
-- exclusivamente pela Edge Function com service_role.
drop policy if exists billing_entitlements_select_own on public.billing_entitlements;

create policy billing_entitlements_select_own
on public.billing_entitlements
for select to authenticated
using (
  exists (
    select 1 from public.billing_customers customer
    where customer.id = billing_entitlements.customer_id
      and customer.auth_user_id = auth.uid()
  )
);
npx supabase secrets set KIWIFY_WEBHOOK_TOKEN="ogP0quQwbCQ8nzRxxyE3JL_xLq194QBTnG-C8qMvIgM"
ogP0quQwbCQ8nzRxxyE3JL_xLq194QBTnG-C8qMvIgM

https://ouffydkgqytzjmehtqjr.supabase.co/functions/v1/kiwify-webhook?token=ogP0quQwbCQ8nzRxxyE3JL_xLq194QBTnG-C8qMvIgM
