-- Fix public form inserts (quote, contact, booking) blocked by missing RLS policies.
-- Run this in Supabase Dashboard → SQL Editor if quote/contact forms return RLS errors.

grant usage on schema public to anon, authenticated;

grant insert on contact_submissions to anon;
grant insert on quote_requests to anon;
grant insert on bookings to anon;

grant select, update on contact_submissions to authenticated;
grant select, update on quote_requests to authenticated;
grant select, update on bookings to authenticated;

drop policy if exists "Allow public contact inserts" on contact_submissions;
drop policy if exists "Allow public quote inserts" on quote_requests;
drop policy if exists "Allow public booking inserts" on bookings;

create policy "Allow public contact inserts" on contact_submissions
  for insert to anon
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and coalesce(length(trim(message)), 0) >= 3
  );

create policy "Allow public quote inserts" on quote_requests
  for insert to anon
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and full_name is not null
    and service_type is not null
  );

create policy "Allow public booking inserts" on bookings
  for insert to anon
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and full_name is not null
    and address is not null
  );
