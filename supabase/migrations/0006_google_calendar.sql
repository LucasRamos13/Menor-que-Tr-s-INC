-- ============================================================================
-- 0006: Google Calendar integration
--
-- Tokens live server-side only: RLS restricts every row to its owning user,
-- but on top of that the app NEVER fetches these tables from client-side
-- code — only Next.js route handlers (running on the server/edge) read or
-- write them, using the request's authenticated session. Treat the RLS here
-- as defense-in-depth, not the only safeguard.
-- ============================================================================

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  couple_id uuid not null references public.couples (id) on delete cascade,
  google_account_email text not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text not null,
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('ok', 'error')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_google_connections_couple_id on public.google_calendar_connections (couple_id);
create trigger trg_google_connections_updated_at before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- One row per Google calendar the user has chosen to sync.

create table public.google_calendar_selections (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.google_calendar_connections (id) on delete cascade,
  google_calendar_id text not null,
  calendar_summary text not null,
  is_syncing boolean not null default true,
  sync_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, google_calendar_id)
);

create trigger trg_google_selections_updated_at before update on public.google_calendar_selections
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Link table between internal `events` rows and Google events. This is what
-- lets sync detect "already imported" vs "brand new" and avoid duplicates.

create table public.calendar_sync_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  connection_id uuid not null references public.google_calendar_connections (id) on delete cascade,
  internal_event_id uuid references public.events (id) on delete cascade,
  google_calendar_id text not null,
  google_event_id text not null,
  etag text,
  google_updated_at timestamptz,
  internal_updated_at timestamptz,
  sync_status text not null default 'synced' check (sync_status in ('synced', 'pending', 'conflict', 'error', 'deleted')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, google_calendar_id, google_event_id)
);

create index idx_calendar_sync_events_couple_id on public.calendar_sync_events (couple_id);
create index idx_calendar_sync_events_internal on public.calendar_sync_events (internal_event_id);
create trigger trg_calendar_sync_events_updated_at before update on public.calendar_sync_events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_selections enable row level security;
alter table public.calendar_sync_events enable row level security;

create policy "google_connections_owner_only" on public.google_calendar_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "google_selections_via_connection" on public.google_calendar_selections for all
  using (exists (select 1 from public.google_calendar_connections c where c.id = google_calendar_selections.connection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.google_calendar_connections c where c.id = google_calendar_selections.connection_id and c.user_id = auth.uid()));

-- Sync-event rows are visible to the whole couple (both members should see
-- "this event came from Google"), but only the connection's owner may write.
create policy "calendar_sync_events_select_couple" on public.calendar_sync_events for select
  using (public.is_couple_member(couple_id));

create policy "calendar_sync_events_write_owner" on public.calendar_sync_events for insert
  with check (exists (select 1 from public.google_calendar_connections c where c.id = calendar_sync_events.connection_id and c.user_id = auth.uid()));

create policy "calendar_sync_events_update_owner" on public.calendar_sync_events for update
  using (exists (select 1 from public.google_calendar_connections c where c.id = calendar_sync_events.connection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.google_calendar_connections c where c.id = calendar_sync_events.connection_id and c.user_id = auth.uid()));

create policy "calendar_sync_events_delete_owner" on public.calendar_sync_events for delete
  using (exists (select 1 from public.google_calendar_connections c where c.id = calendar_sync_events.connection_id and c.user_id = auth.uid()));
