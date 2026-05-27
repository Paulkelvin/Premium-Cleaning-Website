-- Tighten RLS for single-admin dashboard access.
-- Run after schema.sql if your project already exists.

alter table quote_requests add column if not exists frequency text;
alter table quote_requests add column if not exists preferred_contact text;
alter table quote_requests add column if not exists estimated_total numeric(10,2);

alter table bookings add column if not exists property_type text;
alter table bookings add column if not exists bedrooms text;
alter table bookings add column if not exists bathrooms text;
alter table bookings add column if not exists square_feet text;
alter table bookings add column if not exists frequency text;
alter table bookings add column if not exists add_ons text;
alter table bookings add column if not exists estimated_total numeric(10,2);
alter table bookings add column if not exists payment_method text default 'pay_at_service';
alter table bookings add column if not exists payment_status text default 'pending';
alter table bookings add column if not exists quote_id uuid;

drop policy if exists "Allow authenticated contact reads" on contact_submissions;
drop policy if exists "Allow authenticated quote reads" on quote_requests;
drop policy if exists "Allow authenticated booking reads" on bookings;
drop policy if exists "Allow authenticated contact status updates" on contact_submissions;
drop policy if exists "Allow authenticated quote status updates" on quote_requests;
drop policy if exists "Allow authenticated booking status updates" on bookings;

drop policy if exists "Allow public contact inserts" on contact_submissions;
drop policy if exists "Allow public quote inserts" on quote_requests;
drop policy if exists "Allow public booking inserts" on bookings;

create policy "Allow public contact inserts" on contact_submissions
  for insert to public
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and coalesce(length(trim(message)), 0) >= 3
  );

create policy "Allow public quote inserts" on quote_requests
  for insert to public
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and full_name is not null
    and service_type is not null
  );

create policy "Allow public booking inserts" on bookings
  for insert to public
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and full_name is not null
    and address is not null
  );

drop policy if exists "Allow admin contact reads" on contact_submissions;
drop policy if exists "Allow admin quote reads" on quote_requests;
drop policy if exists "Allow admin booking reads" on bookings;
drop policy if exists "Allow admin contact status updates" on contact_submissions;
drop policy if exists "Allow admin quote status updates" on quote_requests;
drop policy if exists "Allow admin booking status updates" on bookings;

create policy "Allow admin contact reads" on contact_submissions
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');

create policy "Allow admin quote reads" on quote_requests
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');

create policy "Allow admin booking reads" on bookings
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');

create policy "Allow admin contact status updates" on contact_submissions
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');

create policy "Allow admin quote status updates" on quote_requests
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');

create policy "Allow admin booking status updates" on bookings
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'paulopackager@gmail.com');
