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
  service_area_name text,
  travel_fee numeric(10,2) default 0,
  payment_method text default 'pay_at_service',
  payment_status text default 'pending',
  quote_id uuid,
  square_checkout_url text,
  square_order_id text,
  square_payment_id text,
  consent boolean default false
);

alter table contact_submissions enable row level security;
alter table quote_requests enable row level security;
alter table bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on contact_submissions to anon;
grant insert on quote_requests to anon;
grant insert on bookings to anon;
grant select, update, delete on contact_submissions to authenticated;
grant select, update, delete on quote_requests to authenticated;
grant select, update, delete on bookings to authenticated;
grant select on admin_users to authenticated;

create table if not exists admin_users (
  email text primary key,
  created_at timestamptz not null default now(),
  invited_by text,
  role text not null default 'admin' check (role in ('admin', 'superuser'))
);

insert into admin_users (email, role) values
  ('ryann@rslegalcollective.com', 'superuser'),
  ('paulopackager@gmail.com', 'superuser')
on conflict (email) do update set role = excluded.role;

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

create or replace function public.is_superuser()
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
      and role = 'superuser'
  );
$$;

grant execute on function public.is_superuser() to authenticated, anon;

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
drop policy if exists "Allow admin contact deletes" on contact_submissions;
drop policy if exists "Allow admin quote deletes" on quote_requests;
drop policy if exists "Allow admin booking deletes" on bookings;
drop policy if exists "Admins read admin_users" on admin_users;

-- Public form inserts (website). Basic sanity checks only — not a spam substitute.
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
    and coalesce(travel_fee, 0) >= 0
    and coalesce(payment_method, 'pay_at_service') in ('pay_online', 'pay_at_service')
    and (
      coalesce(payment_method, 'pay_at_service') <> 'pay_online'
      or coalesce(length(trim(service_area_name)), 0) > 0
    )
    and coalesce(payment_status, 'pending_payment') in ('pending_payment', 'pay_at_service', 'pending')
  );

-- Admin-only reads/updates/deletes — email must exist in admin_users.
create policy "Admins read admin_users" on admin_users
  for select to authenticated
  using (public.is_admin_user());

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

create policy "Allow admin contact deletes" on contact_submissions
  for delete to authenticated
  using (public.is_admin_user());

create policy "Allow admin quote deletes" on quote_requests
  for delete to authenticated
  using (public.is_admin_user());

create policy "Allow admin booking deletes" on bookings
  for delete to authenticated
  using (public.is_admin_user());

create policy "Superusers delete lower admins" on admin_users
  for delete to authenticated
  using (public.is_superuser() and role = 'admin');

create or replace function public.bookings_secure_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.payment_method is null or new.payment_method not in ('pay_online', 'pay_at_service') then
      new.payment_method := 'pay_at_service';
    end if;

    if new.payment_method = 'pay_online' then
      new.payment_status := 'pending_payment';
    else
      new.payment_status := 'pay_at_service';
    end if;

    if new.travel_fee is null or new.travel_fee < 0 then
      new.travel_fee := 0;
    end if;

    new.square_order_id := null;
    new.square_checkout_url := null;
    new.square_payment_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_secure_payment_fields on bookings;

create trigger bookings_secure_payment_fields
  before insert on bookings
  for each row
  execute function public.bookings_secure_payment_fields();
