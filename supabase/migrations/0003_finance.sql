-- ============================================================================
-- 0003: Finance module — accounts, categories, transactions, recurring
-- transactions, installments, budgets, financial goals, contributions.
--
-- Money is always stored as bigint cents. Never store currency as float.
-- ============================================================================

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'wallet', 'credit_card', 'investment', 'other')),
  institution text,
  initial_balance_cents bigint not null default 0,
  is_active boolean not null default true,
  visibility text not null default 'shared' check (visibility in ('shared', 'personal')),
  owner_id uuid references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_personal_needs_owner check (
    (visibility = 'shared' and owner_id is null) or
    (visibility = 'personal' and owner_id is not null)
  )
);

create index idx_accounts_couple_id on public.accounts (couple_id);
create trigger trg_accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  icon text,
  color text,
  kind text not null default 'expense' check (kind in ('income', 'expense', 'both')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, name)
);

create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  category_id uuid references public.categories (id) on delete set null,
  responsible_id uuid references public.profiles (id) on delete set null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count int not null default 1 check (interval_count > 0),
  day_of_month int check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  last_generated_date date,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_end_after_start check (end_date is null or end_date >= start_date)
);

create index idx_recurring_couple_id on public.recurring_transactions (couple_id);
create trigger trg_recurring_updated_at before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  description text not null,
  total_amount_cents bigint not null check (total_amount_cents > 0),
  installment_count int not null check (installment_count > 0),
  first_due_date date not null,
  category_id uuid references public.categories (id) on delete set null,
  responsible_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_installments_couple_id on public.installments (couple_id);
create trigger trg_installments_updated_at before update on public.installments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  transfer_account_id uuid references public.accounts (id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  category_id uuid references public.categories (id) on delete set null,
  responsible_id uuid references public.profiles (id) on delete set null,
  date date not null,
  is_paid boolean not null default true,
  notes text,
  recurring_transaction_id uuid references public.recurring_transactions (id) on delete set null,
  installment_id uuid references public.installments (id) on delete set null,
  installment_number int,
  installment_total int,
  created_by uuid not null references public.profiles (id),
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transfer_needs_destination check (
    (type = 'transfer' and transfer_account_id is not null and transfer_account_id <> account_id) or
    (type <> 'transfer')
  )
);

create index idx_transactions_couple_date on public.transactions (couple_id, date desc);
create index idx_transactions_account on public.transactions (account_id);
create index idx_transactions_category on public.transactions (category_id);
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  limit_cents bigint not null check (limit_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, category_id, year, month)
);

create trigger trg_budgets_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  description text,
  icon text default '🎯',
  target_amount_cents bigint not null check (target_amount_cents > 0),
  current_amount_cents bigint not null default 0 check (current_amount_cents >= 0),
  target_date date,
  category text,
  visibility text not null default 'shared' check (visibility in ('shared', 'personal')),
  owner_id uuid references public.profiles (id) on delete cascade,
  is_completed boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_personal_needs_owner check (
    (visibility = 'shared' and owner_id is null) or
    (visibility = 'personal' and owner_id is not null)
  )
);

create index idx_goals_couple_id on public.financial_goals (couple_id);
create trigger trg_goals_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.financial_goals (id) on delete cascade,
  amount_cents bigint not null check (amount_cents <> 0),
  date date not null default current_date,
  note text,
  contributed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_goal_contributions_goal_id on public.goal_contributions (goal_id);

-- Keep financial_goals.current_amount_cents in sync with its contributions.
create or replace function public.apply_goal_contribution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.financial_goals
      set current_amount_cents = current_amount_cents + new.amount_cents,
          is_completed = (current_amount_cents + new.amount_cents) >= target_amount_cents
      where id = new.goal_id;
  elsif tg_op = 'DELETE' then
    update public.financial_goals
      set current_amount_cents = current_amount_cents - old.amount_cents,
          is_completed = (current_amount_cents - old.amount_cents) >= target_amount_cents
      where id = old.goal_id;
  end if;
  return null;
end;
$$;

create trigger trg_goal_contribution_apply
  after insert or delete on public.goal_contributions
  for each row execute function public.apply_goal_contribution();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Pattern: couple member always required; "personal" rows additionally
-- require ownership before they become visible/writable.

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.installments enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "accounts_all_couple_visible" on public.accounts for all
  using (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()))
  with check (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()));

create policy "categories_all_couple_member" on public.categories for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "recurring_all_couple_member" on public.recurring_transactions for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "installments_all_couple_member" on public.installments for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Transactions inherit personal/shared visibility from their account.
create policy "transactions_all_via_account_visibility" on public.transactions for all
  using (
    public.is_couple_member(couple_id)
    and exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and (a.visibility = 'shared' or a.owner_id = auth.uid())
    )
  )
  with check (
    public.is_couple_member(couple_id)
    and exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id
        and (a.visibility = 'shared' or a.owner_id = auth.uid())
    )
  );

create policy "budgets_all_couple_member" on public.budgets for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "goals_all_couple_visible" on public.financial_goals for all
  using (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()))
  with check (public.is_couple_member(couple_id) and (visibility = 'shared' or owner_id = auth.uid()));

create policy "goal_contributions_via_goal" on public.goal_contributions for all
  using (
    exists (
      select 1 from public.financial_goals g
      where g.id = goal_contributions.goal_id
        and public.is_couple_member(g.couple_id)
        and (g.visibility = 'shared' or g.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.financial_goals g
      where g.id = goal_contributions.goal_id
        and public.is_couple_member(g.couple_id)
        and (g.visibility = 'shared' or g.owner_id = auth.uid())
    )
  );
