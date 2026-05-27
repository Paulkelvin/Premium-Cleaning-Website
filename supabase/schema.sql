-- RS Cleaning Collective — Supabase schema
-- After editing admin email below, re-run this file in the Supabase SQL editor.

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  full_name text,
  email text,
  phone text,
  inquiry_type text,
  message text,
  preferred_contact_method text,
  consent boolean default false
);

create table if not exists quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  full_name text,
  email text,
  phone text,
  service_type text,
  property_type text,
  bedrooms text,
  bathrooms text,
  square_feet text,
  add_ons text,
  message text,
  frequency text,
  preferred_contact text,
  estimated_total numeric(10,2),
  consent boolean default false
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  full_name text,
  email text,
  phone text,
  service_type text,
  property_type text,
  bedrooms text,
  bathrooms text,
  square_feet text,
  add_ons text,
  frequency text,
  preferred_date date,
  preferred_time text,
  address text,
  message text,
  estimated_total numeric(10,2),
  payment_method text default 'pay_at_service',
  payment_status text default 'pending',
  quote_id uuid,
  consent boolean default false
);

alter table contact_submissions enable row level security;
alter table quote_requests enable row level security;
alter table bookings enable row level security;

drop policy if exists "Allow public contact inserts" on contact_submissions;
drop policy if exists "Allow public quote inserts" on quote_requests;
drop policy if exists "Allow public booking inserts" on bookings;
drop policy if exists "Allow authenticated contact reads" on contact_submissions;
drop policy if exists "Allow authenticated quote reads" on quote_requests;
drop policy if exists "Allow authenticated booking reads" on bookings;
drop policy if exists "Allow authenticated contact status updates" on contact_submissions;
drop policy if exists "Allow authenticated quote status updates" on quote_requests;
drop policy if exists "Allow authenticated booking status updates" on bookings;
drop policy if exists "Allow admin contact reads" on contact_submissions;
drop policy if exists "Allow admin quote reads" on quote_requests;
drop policy if exists "Allow admin booking reads" on bookings;
drop policy if exists "Allow admin contact status updates" on contact_submissions;
drop policy if exists "Allow admin quote status updates" on quote_requests;
drop policy if exists "Allow admin booking status updates" on bookings;

-- Public form inserts (website). Basic sanity checks only — not a spam substitute.
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

-- Admin-only reads/updates — must match Supabase Auth user email exactly.
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
