-- Admin team table, dynamic admin checks, and delete permissions.

create table if not exists admin_users (
  email text primary key,
  created_at timestamptz not null default now(),
  invited_by text
);

insert into admin_users (email) values
  ('rs.cleaning@collective.com'),
  ('paulopackager@gmail.com')
on conflict (email) do nothing;

alter table admin_users enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin_user() to authenticated, anon;

grant select on admin_users to authenticated;
grant delete on contact_submissions to authenticated;
grant delete on quote_requests to authenticated;
grant delete on bookings to authenticated;

drop policy if exists "Admins read admin_users" on admin_users;
create policy "Admins read admin_users" on admin_users
  for select to authenticated
  using (public.is_admin_user());

drop policy if exists "Allow admin contact reads" on contact_submissions;
drop policy if exists "Allow admin quote reads" on quote_requests;
drop policy if exists "Allow admin booking reads" on bookings;
drop policy if exists "Allow admin contact status updates" on contact_submissions;
drop policy if exists "Allow admin quote status updates" on quote_requests;
drop policy if exists "Allow admin booking status updates" on bookings;

create policy "Allow admin contact reads" on contact_submissions
  for select to authenticated
  using (public.is_admin_user());

create policy "Allow admin quote reads" on quote_requests
  for select to authenticated
  using (public.is_admin_user());

create policy "Allow admin booking reads" on bookings
  for select to authenticated
  using (public.is_admin_user());

create policy "Allow admin contact status updates" on contact_submissions
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Allow admin quote status updates" on quote_requests
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Allow admin booking status updates" on bookings
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "Allow admin contact deletes" on contact_submissions;
drop policy if exists "Allow admin quote deletes" on quote_requests;
drop policy if exists "Allow admin booking deletes" on bookings;

create policy "Allow admin contact deletes" on contact_submissions
  for delete to authenticated
  using (public.is_admin_user());

create policy "Allow admin quote deletes" on quote_requests
  for delete to authenticated
  using (public.is_admin_user());

create policy "Allow admin booking deletes" on bookings
  for delete to authenticated
  using (public.is_admin_user());
