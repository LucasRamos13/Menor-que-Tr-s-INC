-- ============================================================================
-- 0009: Fix get_couple_month_summary missing an upper date bound.
--
-- It only filtered `date >= p_month_start`, so it summed the current month
-- plus every future-dated transaction too — most visibly wrong for couples
-- using installment plans, which materialize every future installment as a
-- transaction row up front (see createInstallmentPlan). Bounding to
-- [p_month_start, next month start) matches how getBudgetProgressForMonth
-- already scopes its own transaction query.
-- ============================================================================

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
  where couple_id = p_couple_id
    and date >= p_month_start
    and date < (p_month_start + interval '1 month')::date;
$$;
