-- ============================================================================
-- 0011: Track whether a selected Google calendar is read-only.
--
-- Previously the sync only discovered a read-only calendar (e.g. a public
-- holidays subscription) reactively, by attempting a write and catching the
-- resulting 403. That produced a persistent retry loop for at least one
-- reported case where the failed push's bookkeeping never fully caught up
-- with the live state, generating the same "This calendar is read-only"
-- error indefinitely. Google's calendar list already reports each
-- calendar's accessRole ("reader"/"freeBusyReader" means read-only), so we
-- can know this upfront and simply never attempt a push for that calendar,
-- instead of trying and reacting to the failure.
-- ============================================================================

alter table public.google_calendar_selections
  add column is_read_only boolean not null default false;
