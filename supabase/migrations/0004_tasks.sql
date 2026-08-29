-- ============================================================================
-- 0004: Task lists and tasks (shared to-do management)
-- ============================================================================

create table public.task_lists (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  name text not null,
  icon text default '📋',
  color text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_task_lists_couple_id on public.task_lists (couple_id);
create trigger trg_task_lists_updated_at before update on public.task_lists
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  list_id uuid references public.task_lists (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assignee_id uuid references public.profiles (id) on delete set null,
  due_date date,
  category text,
  recurrence_rule jsonb,
  position int not null default 0,
  created_by uuid not null references public.profiles (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_couple_id on public.tasks (couple_id);
create index idx_tasks_list_id on public.tasks (list_id);
create index idx_tasks_due_date on public.tasks (due_date) where status <> 'done';
create index idx_tasks_assignee on public.tasks (assignee_id);
create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Keep completed_at consistent with status without relying on client code.
create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and old.status <> 'done' then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_tasks_completed_at
  before update on public.tasks
  for each row execute function public.sync_task_completed_at();

-- ----------------------------------------------------------------------------
-- Row Level Security

alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;

create policy "task_lists_all_couple_member" on public.task_lists for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create policy "tasks_all_couple_member" on public.tasks for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
