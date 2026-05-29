-- Harden booking payment fields against client tampering.
-- Run in Supabase Dashboard → SQL Editor.

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

drop policy if exists "Allow public booking inserts" on bookings;

create policy "Allow public booking inserts" on bookings
  for insert to anon
  with check (
    consent = true
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and full_name is not null
    and address is not null
    and coalesce(payment_method, 'pay_at_service') in ('pay_online', 'pay_at_service')
    and coalesce(payment_status, 'pending_payment') in ('pending_payment', 'pay_at_service', 'pending')
  );
