-- ============================================================================
-- Dev seed data — OPTIONAL, for local/dev testing only.
--
-- This does NOT create a user or a couple for you (that only happens through
-- a real Google login, since Supabase Auth owns auth.users). Run this AFTER
-- you have logged in at least once with each of the two accounts you want to
-- test with, and after they belong to the same couple (Configurações > Casal).
--
-- How to run:
--   1. Log in to the app once, create/join a couple.
--   2. In the Supabase SQL editor, run:
--        select id from public.couple_members where user_id = auth.uid();
--      (or copy the couple_id from Settings > Couple in the app UI)
--   3. Replace :couple_id below with that UUID and run this whole file.
--
-- No real personal data — everything here is fictional placeholder content.
-- ============================================================================

\set couple_id '00000000-0000-0000-0000-000000000000'

do $$
declare
  v_couple_id uuid := :'couple_id';
  v_checking_account uuid;
  v_wallet_account uuid;
  v_food_category uuid;
  v_salary_category uuid;
  v_creator uuid;
begin
  if v_couple_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Set :couple_id to a real couple id before running this seed.';
  end if;

  select user_id into v_creator from public.couple_members where couple_id = v_couple_id limit 1;

  insert into public.accounts (couple_id, name, type, institution, initial_balance_cents, visibility, created_by)
    values (v_couple_id, 'Conta Corrente', 'checking', 'Banco Exemplo', 300000, 'shared', v_creator)
    returning id into v_checking_account;

  insert into public.accounts (couple_id, name, type, institution, initial_balance_cents, visibility, created_by)
    values (v_couple_id, 'Carteira', 'wallet', null, 15000, 'shared', v_creator)
    returning id into v_wallet_account;

  select id into v_food_category from public.categories where couple_id = v_couple_id and name = 'Alimentação';
  select id into v_salary_category from public.categories where couple_id = v_couple_id and name = 'Salário';

  insert into public.transactions (couple_id, account_id, type, amount_cents, description, category_id, date, created_by)
  values
    (v_couple_id, v_checking_account, 'income', 500000, 'Salário do mês', v_salary_category, date_trunc('month', current_date)::date + 4, v_creator),
    (v_couple_id, v_checking_account, 'expense', 50000, 'Supermercado', v_food_category, current_date - 2, v_creator),
    (v_couple_id, v_wallet_account, 'expense', 3500, 'Padaria', v_food_category, current_date - 1, v_creator);

  insert into public.financial_goals (couple_id, name, description, icon, target_amount_cents, current_amount_cents, target_date, category, created_by)
  values
    (v_couple_id, 'Casamento', 'Reserva para a festa e cerimônia', '💍', 3000000, 1850000, current_date + interval '6 months', 'Casamento', v_creator),
    (v_couple_id, 'Reserva de emergência', null, '🏠', 1000000, 400000, null, 'Reserva', v_creator);

  insert into public.task_lists (couple_id, name, icon) values
    (v_couple_id, 'Casa', '🏠'),
    (v_couple_id, 'Casamento', '💍');

  insert into public.important_dates (couple_id, title, emoji, date, is_recurring_yearly, created_by) values
    (v_couple_id, 'Aniversário de namoro', '❤️', date_trunc('year', current_date)::date + interval '45 days', true, v_creator),
    (v_couple_id, 'Casamento', '💍', current_date + interval '184 days', false, v_creator);

  raise notice 'Seed complete for couple %', v_couple_id;
end $$;
