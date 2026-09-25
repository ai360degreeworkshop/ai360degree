-- AI 360° Degree Workshop — profiles table, roles, and the two demo accounts.
--
-- Paste this whole file into the Supabase SQL editor for project
-- xrutoeezmhphvxozuicr. It is safe to run more than once: every statement is
-- written so a second run leaves the same end state instead of erroring.
--
-- Supabase Auth owns credentials (auth.users holds the hashed password and the
-- session machinery). public.profiles only carries what the app itself reads:
-- the display name and the role that decides /admin vs /user.

-- ---------------------------------------------------------------- table -----

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' constraint profiles_role_check check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for each auth user. role drives /admin vs /user access; '
  'credentials themselves live in auth.users.';

alter table public.profiles enable row level security;

-- --------------------------------------------------------------- helpers ----

-- Reading public.profiles from inside a policy on public.profiles would recurse,
-- so the role check runs as a security definer function.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- --------------------------------------------------------------- policies ---

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "admins read every profile" on public.profiles;
create policy "admins read every profile"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- RLS would let a user update their own row, which includes promoting themselves
-- to admin. This trigger is what actually pins the column down. A null
-- auth.uid() means the statement came from the service role or the SQL editor
-- rather than a browser session, so migrations and this file are not blocked.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'only an admin can change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Signing up should not need a second round trip from the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant select, update on public.profiles to authenticated;

-- ---------------------------------------------------------- demo accounts ---

-- The demo accounts exist so the login and register flows can be exercised.
-- They are inserted through auth.users/auth.identities because GoTrue owns the
-- credential tables; the trigger above fills in the matching profiles rows.
--
-- These are demonstration credentials and the auth pages display them whenever
-- NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS is "true". Treat both as public.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  learner_id uuid := '11111111-1111-4111-8111-111111111111';
  admin_id   uuid := '22222222-2222-4222-8222-222222222222';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values
    (
      '00000000-0000-0000-0000-000000000000', learner_id, 'authenticated', 'authenticated',
      'learner@ai360degree.demo',
      extensions.crypt('DemoLearner#2026', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Learner"}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@ai360degree.demo',
      extensions.crypt('DemoAdmin#2026', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values
    (
      gen_random_uuid(), learner_id,
      jsonb_build_object('sub', learner_id::text, 'email', 'learner@ai360degree.demo', 'email_verified', true),
      'email', learner_id::text, now(), now(), now()
    ),
    (
      gen_random_uuid(), admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@ai360degree.demo', 'email_verified', true),
      'email', admin_id::text, now(), now(), now()
    )
  on conflict do nothing;
end;
$$;

-- Roles and display names. The learner keeps the default 'user' role.
update public.profiles set role = 'admin', full_name = 'Demo Admin'
  where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set full_name = 'Demo Learner'
  where id = '11111111-1111-4111-8111-111111111111';

-- ----------------------------------------------------------- verification ---

-- Expect two rows: learner => user, admin => admin.
select p.email, p.full_name, p.role
from public.profiles p
where p.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
)
order by p.role;
