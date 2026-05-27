-- Allow rs.cleaning@collective.com (and keep paulopackager@gmail.com) for admin dashboard RLS.
-- Run in Supabase → SQL Editor if login works but dashboard data is empty / forbidden.

drop policy if exists "Allow admin contact reads" on contact_submissions;
drop policy if exists "Allow admin quote reads" on quote_requests;
drop policy if exists "Allow admin booking reads" on bookings;
drop policy if exists "Allow admin contact status updates" on contact_submissions;
drop policy if exists "Allow admin quote status updates" on quote_requests;
drop policy if exists "Allow admin booking status updates" on bookings;

create policy "Allow admin contact reads" on contact_submissions
  for select to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));

create policy "Allow admin quote reads" on quote_requests
  for select to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));

create policy "Allow admin booking reads" on bookings
  for select to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));

create policy "Allow admin contact status updates" on contact_submissions
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));

create policy "Allow admin quote status updates" on quote_requests
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));

create policy "Allow admin booking status updates" on bookings
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('rs.cleaning@collective.com', 'paulopackager@gmail.com'));
