-- ============================================================================
-- 0002: Profiles, Couples, Couple Members, Couple Invites
--
-- One profile per Supabase auth user. Two (or more, in the future) profiles
-- are grouped into a "couple". All shared data hangs off couple_id, never
-- directly off a user, so the schema already supports more than two members
-- or more than one couple per household without a rewrite.
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  google_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Mirrors auth.users with the public profile fields we care about.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nosso espaço',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_couples_updated_at
  before update on public.couples
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------

create table public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  -- MVP constraint: a user belongs to a single couple. Relaxing this later
  -- (multiple households) only requires dropping this unique index, no
  -- structural change to the rest of the schema.
  unique (user_id)
);

create index idx_couple_members_couple_id on public.couple_members (couple_id);

-- ----------------------------------------------------------------------------
-- Invite codes let member A bring member B into the same couple without
-- either of them ever seeing the other's raw user id.
create table public.couple_invites (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples (id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.profiles (id) on delete set null
);

create index idx_couple_invites_code on public.couple_invites (code);

-- ----------------------------------------------------------------------------
-- Helper functions used throughout every later RLS policy.
-- SECURITY DEFINER lets them read couple_members without recursing through
-- couple_members' own RLS policy.

create or replace function public.get_my_couple_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select couple_id from public.couple_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = auth.uid()
  );
$$;

grant execute on function public.get_my_couple_id() to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Auto-provisioning: every new Supabase Auth user gets a profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, google_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'provider_id'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.couple_invites enable row level security;

-- profiles: everyone can read their own profile and their partner's (needed
-- to show name/avatar across shared data); only the owner can update it.
create policy "profiles_select_self_or_partner"
  on public.profiles for select
  using (
    id = auth.uid()
    or id in (
      select cm.user_id from public.couple_members cm
      where cm.couple_id = public.get_my_couple_id()
    )
  );

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- couples: members can read/update their own couple.
create policy "couples_select_member"
  on public.couples for select
  using (public.is_couple_member(id));

create policy "couples_update_member"
  on public.couples for update
  using (public.is_couple_member(id))
  with check (public.is_couple_member(id));

create policy "couples_insert_authenticated"
  on public.couples for insert
  with check (auth.uid() is not null);

-- couple_members: members can see the roster of their own couple.
create policy "couple_members_select_own_couple"
  on public.couple_members for select
  using (couple_id = public.get_my_couple_id());

-- A user may only insert a membership row for themself (used both when
-- creating a brand-new couple and when redeeming an invite).
create policy "couple_members_insert_self"
  on public.couple_members for insert
  with check (user_id = auth.uid());

create policy "couple_members_delete_self"
  on public.couple_members for delete
  using (user_id = auth.uid());

-- couple_invites: members can create/view invites for their own couple.
-- Redeeming an invite is done through a SECURITY DEFINER RPC (see below) so
-- that an unrelated user can look up a single invite by code without being
-- granted broad select access to every invite in the system.
create policy "couple_invites_select_own_couple"
  on public.couple_invites for select
  using (couple_id = public.get_my_couple_id());

create policy "couple_invites_insert_own_couple"
  on public.couple_invites for insert
  with check (couple_id = public.get_my_couple_id() and created_by = auth.uid());

create policy "couple_invites_delete_own_couple"
  on public.couple_invites for delete
  using (couple_id = public.get_my_couple_id());

-- ----------------------------------------------------------------------------
-- RPCs for the couple-pairing flow (create + redeem), kept minimal on purpose.

create or replace function public.create_my_couple(p_name text default 'Nosso espaço')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'user_already_in_couple';
  end if;

  insert into public.couples (name) values (p_name) returning id into v_couple_id;
  insert into public.couple_members (couple_id, user_id, role) values (v_couple_id, auth.uid(), 'owner');
  return v_couple_id;
end;
$$;

create or replace function public.redeem_couple_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.couple_invites%rowtype;
begin
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'user_already_in_couple';
  end if;

  select * into v_invite from public.couple_invites
    where code = p_code and used_at is null and expires_at > now()
    for update;

  if not found then
    raise exception 'invalid_or_expired_invite';
  end if;

  insert into public.couple_members (couple_id, user_id, role) values (v_invite.couple_id, auth.uid(), 'member');
  update public.couple_invites set used_at = now(), used_by = auth.uid() where id = v_invite.id;

  return v_invite.couple_id;
end;
$$;

grant execute on function public.create_my_couple(text) to authenticated;
grant execute on function public.redeem_couple_invite(text) to authenticated;
