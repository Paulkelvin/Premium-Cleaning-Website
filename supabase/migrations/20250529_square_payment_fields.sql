-- Square payment tracking columns (required for checkout + webhooks).
-- Run in Supabase Dashboard → SQL Editor if confirm-payment fails.

alter table bookings add column if not exists square_checkout_url text;
alter table bookings add column if not exists square_order_id text;
alter table bookings add column if not exists square_payment_id text;
