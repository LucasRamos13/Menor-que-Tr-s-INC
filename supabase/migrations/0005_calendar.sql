-- ============================================================================
-- 0005: Internal calendar — events, participants, important dates
-- ============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  category text,
  recurrence_rule text, -- RFC5545 RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO
  visibility text not null default 'shared' check (visibility in ('shared', 'personal')),
  owner_id uuid references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at >= start_at),
  constraint events_personal_needs_owner check (
    (visibility = 'shared' and owner_id is null) or
    (visibility = 'personal' and owner_id is not null)
  )
);

create index idx_events_couple_id on public.events (couple_id);
create index idx_events_start_at on public.events (start_at);
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ----------------------------------------------------------------------------

create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  title text not null,
  emoji text default '📅',
  date date not null,
  is_recurring_yearly boolean not null default true,
  category text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_important_dates_couple_id on public.important_dates (couple_id);
create trigger trg_important_dates_updated_at before update on public.important_dates
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.important_dates enable row level security;

create policy "events_all_couple_visible" on public.events for all
  using (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()))
  with check (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()));

create policy "event_participants_via_event" on public.event_participants for all
  using (exists (select 1 from public.events e where e.id = event_participants.event_id and public.is_couple_member(e.couple_id)))
  with check (exists (select 1 from public.events e where e.id = event_participants.event_id and public.is_couple_member(e.couple_id)));

create policy "important_dates_all_couple_member" on public.important_dates for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
