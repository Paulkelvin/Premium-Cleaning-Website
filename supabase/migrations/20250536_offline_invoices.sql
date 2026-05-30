-- Offline admin invoices: owner-created bookings with locked pricing + email tracking.

alter table bookings add column if not exists source text default 'website';
alter table bookings add column if not exists pricing_locked boolean default false;
alter table bookings add column if not exists admin_notes text;
alter table bookings add column if not exists invoice_sent_at timestamptz;

create or replace function public.bookings_secure_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.source, 'website') = 'admin' then
      if new.payment_method is null or new.payment_method not in ('pay_online', 'pay_at_service') then
        new.payment_method := 'pay_online';
      end if;
      if new.payment_status is null then
        new.payment_status := 'invoice_draft';
      end if;
      new.square_order_id := null;
      new.square_checkout_url := null;
      new.square_payment_id := null;
      return new;
    end if;

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
