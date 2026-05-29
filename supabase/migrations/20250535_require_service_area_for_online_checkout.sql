-- Require confirmed service area for online checkout bookings.
-- Run in Supabase Dashboard -> SQL Editor.

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
    and (
      coalesce(payment_method, 'pay_at_service') <> 'pay_online'
      or coalesce(length(trim(service_area_name)), 0) > 0
    )
    and coalesce(payment_status, 'pending_payment') in ('pending_payment', 'pay_at_service', 'pending')
  );
