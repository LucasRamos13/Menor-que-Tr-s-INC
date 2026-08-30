-- ============================================================================
-- 0008: Server-side aggregates for the dashboard's balance/month summary.
--
-- The dashboard previously fetched up to 1000 full transaction rows into the
-- Next.js server runtime just to sum a couple of numbers in JS. On Cloudflare
-- Workers that costs real CPU time (parsing + serializing every row) on top
-- of a plain network round trip, and pushed the dashboard past the platform's
-- CPU-per-request ceiling once couples had real transaction history. Doing
-- the sum in Postgres instead means the Worker only ever receives one row.
--
-- SECURITY INVOKER (the default for `language sql` functions): these run as
-- the calling user, so the existing RLS policies on accounts/transactions
-- still apply — a couple_id the caller isn't a member of simply yields zero
-- rows, no bypass needed here (unlike get_my_couple_id/is_couple_member,
-- which must be SECURITY DEFINER to read couple_members without recursing).
-- ============================================================================

create or replace function public.get_couple_balance(p_couple_id uuid)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
    a.initial_balance_cents
    + coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'income' and t.account_id = a.id), 0)
    - coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'expense' and t.account_id = a.id), 0)
    - coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'transfer' and t.account_id = a.id), 0)
    + coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'transfer' and t.transfer_account_id = a.id), 0)
  ), 0)
  from public.accounts a
  where a.couple_id = p_couple_id and a.is_active = true;
$$;

create or replace function public.get_couple_month_summary(p_couple_id uuid, p_month_start date)
returns table(income_cents bigint, expense_cents bigint)
language sql
stable
set search_path = public
as $$
  select
    coalesce(sum(amount_cents) filter (where type = 'income'), 0)::bigint as income_cents,
    coalesce(sum(amount_cents) filter (where type = 'expense'), 0)::bigint as expense_cents
  from public.transactions
  where couple_id = p_couple_id and date >= p_month_start;
$$;

grant execute on function public.get_couple_balance(uuid) to authenticated;
grant execute on function public.get_couple_month_summary(uuid, date) to authenticated;
