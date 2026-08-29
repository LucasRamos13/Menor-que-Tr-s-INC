-- ============================================================================
-- 0007: Seed sensible default categories automatically for every new couple,
-- so a fresh household never starts with an empty category list.
-- ============================================================================

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (couple_id, name, icon, kind, is_default) values
    (new.id, 'Moradia', '🏠', 'expense', true),
    (new.id, 'Alimentação', '🍽️', 'expense', true),
    (new.id, 'Transporte', '🚗', 'expense', true),
    (new.id, 'Lazer', '🎉', 'expense', true),
    (new.id, 'Saúde', '💊', 'expense', true),
    (new.id, 'Educação', '📚', 'expense', true),
    (new.id, 'Assinaturas', '📱', 'expense', true),
    (new.id, 'Casamento', '💍', 'both', true),
    (new.id, 'Investimentos', '📈', 'both', true),
    (new.id, 'Salário', '💼', 'income', true),
    (new.id, 'Freelance', '💻', 'income', true),
    (new.id, 'Outros', '📦', 'both', true);
  return new;
end;
$$;

create trigger trg_seed_default_categories
  after insert on public.couples
  for each row execute function public.seed_default_categories();
