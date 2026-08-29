-- ============================================================================
-- 0001: Extensions and shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto";

-- Generic updated_at trigger, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on every UPDATE. Attach as a BEFORE UPDATE trigger.';
