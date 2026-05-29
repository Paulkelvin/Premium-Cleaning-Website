-- Run this ONCE in Supabase → SQL Editor (full script, then click Run).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS.

-- 1) Admin team table + superuser seed
create table if not exists admin_users (
  email text primary key,
  created_at timestamptz not null default now(),
  invited_by text,
  role text not null default 'admin'
);

alter table admin_users drop constraint if exists admin_users_role_check;
alter table admin_users add constraint admin_users_role_check check (role in ('admin', 'superuser'));

insert into admin_users (email, role) values
  ('rs.cleaning@collective.com', 'superuser'),
  ('paulopackager@gmail.com', 'superuser')
on conflict (email) do update set role = excluded.role;

alter table admin_users enable row level security;

-- 2) Helper functions
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_superuser()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'superuser'
  );
$$;

grant execute on function public.is_admin_user() to authenticated, anon;
grant execute on function public.is_superuser() to authenticated, anon;
grant select on admin_users to authenticated;
grant delete on contact_submissions to authenticated;
grant delete on quote_requests to authenticated;
grant delete on bookings to authenticated;

-- 3) Admin team policies
drop policy if exists "Admins read admin_users" on admin_users;
create policy "Admins read admin_users" on admin_users
  for select to authenticated
  using (public.is_admin_user());

drop policy if exists "Superusers delete lower admins" on admin_users;
create policy "Superusers delete lower admins" on admin_users
  for delete to authenticated
  using (public.is_superuser() and role = 'admin');

-- 4) Lead table policies (requires contact_submissions, quote_requests, bookings)
drop policy if exists "Allow admin contact reads" on contact_submissions;
drop policy if exists "Allow admin quote reads" on quote_requests;
drop policy if exists "Allow admin booking reads" on bookings;
drop policy if exists "Allow admin contact status updates" on contact_submissions;
drop policy if exists "Allow admin quote status updates" on quote_requests;
drop policy if exists "Allow admin booking status updates" on bookings;
drop policy if exists "Allow admin contact deletes" on contact_submissions;
drop policy if exists "Allow admin quote deletes" on quote_requests;
drop policy if exists "Allow admin booking deletes" on bookings;

create policy "Allow admin contact reads" on contact_submissions
  for select to authenticated using (public.is_admin_user());
create policy "Allow admin quote reads" on quote_requests
  for select to authenticated using (public.is_admin_user());
create policy "Allow admin booking reads" on bookings
  for select to authenticated using (public.is_admin_user());

create policy "Allow admin contact status updates" on contact_submissions
  for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());
create policy "Allow admin quote status updates" on quote_requests
  for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());
create policy "Allow admin booking status updates" on bookings
  for update to authenticated
  using (public.is_admin_user()) with check (public.is_admin_user());

create policy "Allow admin contact deletes" on contact_submissions
  for delete to authenticated using (public.is_admin_user());
create policy "Allow admin quote deletes" on quote_requests
  for delete to authenticated using (public.is_admin_user());
create policy "Allow admin booking deletes" on bookings
  for delete to authenticated using (public.is_admin_user());
