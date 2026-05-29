-- Persist service area metadata on bookings and include travel fee safely.
-- Run in Supabase Dashboard -> SQL Editor.

alter table if exists bookings
  add column if not exists service_area_name text;

alter table if exists bookings
  add column if not exists travel_fee numeric(10,2) default 0;

update bookings
set travel_fee = 0
where travel_fee is null or travel_fee < 0;

alter table bookings
  alter column travel_fee set default 0;

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

drop policy if exists "Allow public booking inserts" on bookings;

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
    and coalesce(payment_status, 'pending_payment') in ('pending_payment', 'pay_at_service', 'pending')
  );
