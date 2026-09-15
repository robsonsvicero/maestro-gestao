-- Controle idempotente dos eventos criados no Google Calendar.
-- Execute antes de publicar a Edge Function sync-google-calendar.

alter table public.lesson
  add column if not exists google_calendar_event_id text,
  add column if not exists google_calendar_sync_status text not null default 'pending',
  add column if not exists google_calendar_sync_error text;

alter table public.lesson
  drop constraint if exists lesson_google_calendar_sync_status_check;

alter table public.lesson
  add constraint lesson_google_calendar_sync_status_check
  check (google_calendar_sync_status in ('pending', 'synced', 'error'));

create index if not exists lesson_google_calendar_pending_idx
  on public.lesson (user_id, date)
  where google_calendar_event_id is null;

create table if not exists public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_email text not null,
  calendar_id text not null default 'primary',
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected'
    check (status in ('connected', 'error', 'revoked')),
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_calendar_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
revoke all on public.google_calendar_connections from anon, authenticated;
revoke all on public.google_calendar_oauth_states from anon, authenticated;
