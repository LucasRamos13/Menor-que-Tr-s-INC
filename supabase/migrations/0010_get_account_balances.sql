-- ============================================================================
-- 0010: Per-account balances computed in Postgres.
--
-- The Finance page fetched up to 1000 full transaction rows into the Worker
-- just so AccountsManager could sum each account's balance client-side —
-- the exact anti-pattern 0008 already fixed for the dashboard's single total.
-- Same fix, per-account this time.
--
-- SECURITY INVOKER (default for `language sql`): runs as the calling user,
-- so RLS on accounts/transactions still applies.
-- ============================================================================

create or replace function public.get_account_balances(p_couple_id uuid)
returns table(account_id uuid, balance_cents bigint)
language sql
stable
set search_path = public
as $$
  select
    a.id as account_id,
    a.initial_balance_cents
    + coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'income' and t.account_id = a.id), 0)
    - coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'expense' and t.account_id = a.id), 0)
    - coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'transfer' and t.account_id = a.id), 0)
    + coalesce((select sum(t.amount_cents) from public.transactions t where t.couple_id = p_couple_id and t.type = 'transfer' and t.transfer_account_id = a.id), 0)
    as balance_cents
  from public.accounts a
  where a.couple_id = p_couple_id;
$$;

grant execute on function public.get_account_balances(uuid) to authenticated;
