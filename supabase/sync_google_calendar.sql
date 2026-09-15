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
